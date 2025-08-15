const express = require('express');
const router = express.Router();
const db = require('../db');
const csrf = require('../middleware/csrf');
const slugify = require('../util/slug');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Simple admin session using express-session; store flag in session
function ensureAdmin(req, res, next) {
	if (req.session && req.session.isAdmin) return next();
	return res.redirect('/admin/login');
}

router.get('/admin/login', csrf, (req, res) => {
	res.render('admin/form', { title: 'Admin Login', adminLogin: true, error: null });
});

router.post('/admin/login', csrf, async (req, res) => {
	const { password } = req.body;
	if (password && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
		req.session.isAdmin = true;
		return req.session.save(() => res.redirect('/admin'));
	}
	res.status(401).render('admin/form', { title: 'Admin Login', adminLogin: true, error: 'Invalid admin password' });
});

router.post('/admin/logout', csrf, ensureAdmin, (req, res) => {
	delete req.session.isAdmin;
	req.session.save(() => res.redirect('/'));
});

// Dashboard list
router.get('/admin', ensureAdmin, csrf, async (req, res, next) => {
	try {
		const deals = await db.all(`SELECT d.id, d.title, d.category, d.is_active,
			(SELECT MIN(price_cents) FROM deal_options o WHERE o.deal_id = d.id) as from_price_cents
			FROM deals d ORDER BY d.id DESC`);
		res.render('admin/dashboard', { title: 'Admin Dashboard', deals });
	} catch (e) { next(e); }
});

// Create form
router.get('/admin/deals/new', ensureAdmin, csrf, (req, res) => {
	res.render('admin/form', { title: 'New Deal', deal: null, option: null, adminLogin: false, error: null });
});

// Edit form
router.get('/admin/deals/:id/edit', ensureAdmin, csrf, async (req, res, next) => {
	try {
		const deal = await db.get('SELECT * FROM deals WHERE id = ?', [req.params.id]);
		if (!deal) return res.redirect('/admin');
		const option = await db.get('SELECT * FROM deal_options WHERE deal_id = ? LIMIT 1', [deal.id]);
		res.render('admin/form', { title: 'Edit Deal', deal, option, adminLogin: false, error: null });
	} catch (e) { next(e); }
});

// Upload config
const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) { try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) { /* ignore */ } }
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const ok = ['.jpg','.jpeg','.png','.webp'];
    const safeExt = ok.includes(ext) ? ext : '.dat';
    const rand = Math.random().toString(36).slice(2,8);
    cb(null, Date.now() + '_' + rand + safeExt);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2*1024*1024 },
  fileFilter: (req, file, cb) => {
    if(['image/jpeg','image/png','image/webp'].includes(file.mimetype)) return cb(null,true);
    return cb(new Error('INVALID_FILE_TYPE'));
  }
});
function uploadHandler(field) { return (req,res,next)=>upload.single(field)(req,res,err=>{ if(!err) return next(); if(err.message==='INVALID_FILE_TYPE') { req.uploadError='Invalid image type.'; return next(); } if(err.code==='LIMIT_FILE_SIZE'){ req.uploadError='File too large (max 2MB).'; return next(); } return next(err); }); }

// Create with upload support
// NOTE: uploadHandler MUST come before csrf for multipart parsing
router.post('/admin/deals', ensureAdmin, uploadHandler('image_file'), csrf, async (req, res, next) => {
	try {
		const { title, category, price_cents, list_price_cents, active, merchant_name, teaser, badge_text, promo_code, promo_note, rating_avg, rating_count, ends_at, image_url, remove_image } = req.body;
		if (req.uploadError) {
			return res.status(400).render('admin/form', { title: 'New Deal', deal: null, option: null, adminLogin: false, error: req.uploadError });
		}
		if (!title || !category) return res.status(400).send('Missing fields');
		let baseSlug = slugify(title); let slug = baseSlug; let i = 1;
		while (await db.get('SELECT 1 FROM deals WHERE slug = ?', [slug])) { slug = `${baseSlug}-${i++}`; }
		let finalImageUrl = null;
		if (!remove_image) {
			finalImageUrl = (image_url && image_url.trim()) || null;
			if (req.file) finalImageUrl = '/uploads/' + req.file.filename;
		}
		await db.run(`INSERT INTO deals (title, slug, category, list_price_cents, is_active, merchant_name, teaser, badge_text, promo_code, promo_note, rating_avg, rating_count, ends_at, image_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [title, slug, category, list_price_cents || null, active ? 1 : 0, merchant_name || null, teaser || null, badge_text || null, promo_code || null, promo_note || null, rating_avg || null, rating_count || null, ends_at || null, finalImageUrl]);
		const deal = await db.get('SELECT id FROM deals WHERE slug = ?', [slug]);
		if (price_cents) await db.run('INSERT INTO deal_options (deal_id, name, price_cents) VALUES (?,?,?)', [deal.id, 'Standard', parseInt(price_cents, 10)]);
		res.redirect(`/admin/deals/${deal.id}/edit`);
	} catch (e) { next(e); }
});

// Update (deal + single option create/update)
router.post('/admin/deals/:id', ensureAdmin, uploadHandler('image_file'), csrf, async (req, res, next) => {
	try {
		const { title, category, price_cents, list_price_cents, active, merchant_name, teaser, badge_text, promo_code, promo_note, rating_avg, rating_count, ends_at, image_url, remove_image } = req.body;
		const deal = await db.get('SELECT * FROM deals WHERE id = ?', [req.params.id]);
		if (!deal) return res.redirect('/admin');
		if (req.uploadError) {
			const optExisting = await db.get('SELECT * FROM deal_options WHERE deal_id = ? LIMIT 1', [deal.id]);
			return res.status(400).render('admin/form', { title: 'Edit Deal', deal, option: optExisting, adminLogin: false, error: req.uploadError });
		}
		let oldUploadPath = (deal.image_url && deal.image_url.startsWith('/uploads/')) ? path.join(uploadDir, path.basename(deal.image_url)) : null;
		let finalImageUrl = deal.image_url;
		if (remove_image) {
			finalImageUrl = null;
		} else if (req.file) {
			finalImageUrl = '/uploads/' + req.file.filename;
		} else if (image_url && image_url.trim()) {
			finalImageUrl = image_url.trim();
		}
		await db.run('UPDATE deals SET title=?, category=?, list_price_cents=?, is_active=?, merchant_name=?, teaser=?, badge_text=?, promo_code=?, promo_note=?, rating_avg=?, rating_count=?, ends_at=?, image_url=? WHERE id=?', [title || deal.title, category || deal.category, list_price_cents || deal.list_price_cents, active ? 1 : 0, merchant_name || null, teaser || null, badge_text || null, promo_code || null, promo_note || null, rating_avg || null, rating_count || null, ends_at || null, finalImageUrl, deal.id]);
		if (req.file && oldUploadPath && oldUploadPath !== path.join(uploadDir, path.basename(finalImageUrl || ''))) {
			try { fs.unlinkSync(oldUploadPath); } catch (e) { /* ignore */ }
		}
		const option = await db.get('SELECT * FROM deal_options WHERE deal_id = ? LIMIT 1', [deal.id]);
		if (price_cents) {
			if (option) {
				await db.run('UPDATE deal_options SET price_cents=? WHERE id=?', [parseInt(price_cents, 10), option.id]);
			} else {
				await db.run('INSERT INTO deal_options (deal_id, name, price_cents) VALUES (?,?,?)', [deal.id, 'Standard', parseInt(price_cents, 10)]);
			}
		}
		res.redirect(`/admin/deals/${deal.id}/edit`);
	} catch (e) { next(e); }
});

// Archive / Unarchive toggle
router.post('/admin/deals/:id/toggle', ensureAdmin, csrf, async (req, res, next) => {
	try {
		const deal = await db.get('SELECT id,is_active FROM deals WHERE id = ?', [req.params.id]);
		if (deal) {
			await db.run('UPDATE deals SET is_active=? WHERE id=?', [deal.is_active ? 0 : 1, deal.id]);
		}
		res.redirect('/admin');
	} catch (e) { next(e); }
});

module.exports = router;

// Local CSRF error handler (after routes)
router.use((err, req, res, next) => {
	if (err && err.code === 'EBADCSRFTOKEN') {
		return res.status(403).send('Forbidden (invalid CSRF token)');
	}
	return next(err);
});
