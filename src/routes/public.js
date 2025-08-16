const express = require('express');
const router = express.Router();
const db = require('../db');

const VALID_CATEGORIES = ['hotel','restaurant','experience'];

// robots.txt
router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n`);
});

// sitemap.xml (simple, dynamic)
router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const rows = await db.all(`SELECT slug, updated_at, created_at FROM deals WHERE is_active = 1`);
    const today = new Date().toISOString().slice(0,10);
    const urls = [
      { loc: '/', lastmod: today },
      ...rows.map(r => ({ loc: `/deal/${r.slug}`, lastmod: (r.updated_at||r.created_at||today).toString().slice(0,10) }))
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map(u => `  <url><loc>${req.protocol}://${req.get('host')}${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n') +
      `\n</urlset>`;
    res.type('application/xml').send(xml);
  } catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;
    const sort = (req.query.sort || 'popular').toLowerCase();
    const VALID_SORTS = ['popular','price','ending'];
    const effectiveSort = VALID_SORTS.includes(sort) ? sort : 'popular';
    let where = 'WHERE d.is_active = 1';
    const params = [];
    if (category && VALID_CATEGORIES.includes(category)) {
      where += ' AND d.category = ?';
      params.push(category);
    }
    let orderBy;
    switch (effectiveSort) {
      case 'price':
        // Null (no option price) last, then ascending price, fallback to recency
        orderBy = 'ORDER BY (from_price_cents IS NULL) ASC, from_price_cents ASC, d.created_at DESC';
        break;
      case 'ending':
        // Soonest ending first; null (no deadline) last
        orderBy = 'ORDER BY (d.ends_at IS NULL) ASC, d.ends_at ASC, d.created_at DESC';
        break;
      case 'popular':
      default:
        orderBy = 'ORDER BY COALESCE(d.featured_rank, 9999), d.created_at DESC';
    }
    const rows = await db.all(`
      SELECT d.id, d.slug, d.title, d.teaser, d.category, d.image_url,
             d.list_price_cents, d.merchant_name, d.badge_text, d.rating_avg, d.rating_count, d.ends_at,
             MIN(o.price_cents) AS from_price_cents
      FROM deals d
      LEFT JOIN deal_options o ON o.deal_id = d.id AND o.status = 'active'
      ${where}
      GROUP BY d.id
      ${orderBy}
    `, params);
    const CAT_EMOJI = { hotel: '🏨', restaurant: '🍽️', experience: '🌊', flight: '✈️' };
    const deals = rows.map(r => {
      const discount_percent = (r.list_price_cents && r.from_price_cents && r.list_price_cents > r.from_price_cents)
        ? Math.round((1 - (r.from_price_cents / r.list_price_cents)) * 100) : null;
      return {
        slug: r.slug,
        title: r.title,
        teaser: r.teaser,
        category: r.category,
        category_emoji: CAT_EMOJI[r.category] || '',
        image_url: r.image_url || '/img/placeholder.jpg',
        from_price_cents: r.from_price_cents,
        list_price_cents: r.list_price_cents,
        merchant_name: r.merchant_name,
        badge_text: r.badge_text,
        rating_avg: r.rating_avg,
        rating_count: r.rating_count,
        ends_at: r.ends_at,
        discount_percent
      };
    });
    const featuredDeal = deals[0] || null;
    const updatedAt = new Date().toLocaleTimeString();
    const newDealsCount = deals.length; // simple placeholder
    res.render('home', { title: 'Puerto Rico Travel Deals', deals, featuredDeal, updatedAt, newDealsCount, currentCategory: category, currentSort: effectiveSort });
  } catch (err) { next(err); }
});

router.get('/deal/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const deal = await db.get(`
      SELECT d.*, MIN(o.price_cents) AS from_price_cents,
        (SELECT id FROM deal_options o2 WHERE o2.deal_id = d.id AND o2.status='active' ORDER BY o2.id LIMIT 1) AS main_option_id
      FROM deals d
      LEFT JOIN deal_options o ON o.deal_id = d.id AND o.status = 'active'
      WHERE d.slug = ? AND d.is_active = 1
      GROUP BY d.id
    `, [slug]);
    if (!deal) {
      res.status(404);
      return res.render('deal', { title: 'Deal Not Found', deal: null });
    }
    // Compute discount percent + time left (days)
    if (deal.list_price_cents && deal.from_price_cents && deal.list_price_cents > deal.from_price_cents) {
      deal.discount_percent = Math.round((1 - (deal.from_price_cents / deal.list_price_cents)) * 100);
    }
    if (deal.ends_at) {
      const diffMs = new Date(deal.ends_at).getTime() - Date.now();
      if (diffMs > 0) {
        deal.time_left_days = Math.ceil(diffMs / (24*3600*1000));
      }
    }
    res.render('deal', { title: deal.title, deal, currentCategory: deal.category });
  } catch (err) { next(err); }
});

module.exports = router;
