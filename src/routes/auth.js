const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { passport } = require('../auth');
const db = require('../db');
const csrf = require('../middleware/csrf');

const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

function ensureAuthed(req, res, next) {
	if (req.isAuthenticated && req.isAuthenticated()) return next();
	return res.redirect('/login');
}

router.get('/login', csrf, (req, res) => {
	res.render('auth/login', { title: 'Login', error: null });
});

router.post('/login', authLimiter, csrf, (req, res, next) => {
	passport.authenticate('local', (err, user, info) => {
		if (err) return next(err);
		if (!user) return res.status(401).render('auth/login', { title: 'Login', error: info && info.message });
			// regenerate then log in
			req.session.regenerate((regenErr) => {
				if (regenErr) return next(regenErr);
				req.logIn(user, (err2) => {
					if (err2) return next(err2);
					req.session.save(() => res.redirect('/account'));
				});
			});
	})(req, res, next);
});

router.get('/signup', csrf, (req, res) => {
	res.render('auth/signup', { title: 'Sign Up', error: null });
});

router.post('/signup', authLimiter, csrf, async (req, res, next) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).render('auth/signup', { title: 'Sign Up', error: 'Email & password required' });
		}
		const existing = await db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
		if (existing) {
			return res.status(400).render('auth/signup', { title: 'Sign Up', error: 'Email already registered' });
		}
		const hash = await bcrypt.hash(password, 12);
		await db.run('INSERT INTO users (email, password_hash, name) VALUES (?,?,?)', [email.toLowerCase(), hash, email.split('@')[0]]);
		const user = await db.get('SELECT id, email, name, role FROM users WHERE email = ?', [email.toLowerCase()]);
		// Regenerate session to avoid fixation & ensure clean store
		req.session.regenerate((regenErr) => {
			if (regenErr) return next(regenErr);
			req.logIn(user, (err) => {
				if (err) return next(err);
				req.session.save(() => res.redirect('/account'));
			});
		});
	} catch (e) { next(e); }
});

router.post('/logout', csrf, (req, res, next) => {
	req.logout(err => {
		if (err) return next(err);
		req.session.destroy(() => {
			res.redirect('/');
		});
	});
});

router.get('/account', ensureAuthed, csrf, (req, res) => {
	res.render('account', { title: 'My Account', user: req.user });
});

// Google OAuth
router.get('/auth/google', (req, res, next) => {
	const scope = ['profile', 'email'];
	passport.authenticate('google', { scope })(req, res, next);
});

router.get('/auth/google/callback', (req, res, next) => {
	passport.authenticate('google', (err, user) => {
		if (err) return next(err);
		if (!user) return res.redirect('/login');
		req.logIn(user, err2 => {
			if (err2) return next(err2);
			req.session.save(() => res.redirect('/account'));
		});
	})(req, res, next);
});

module.exports = router;
