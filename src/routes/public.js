const express = require('express');
const router = express.Router();
const db = require('../db');

const VALID_CATEGORIES = ['hotel','restaurant','experience'];

router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;
    let where = 'WHERE d.is_active = 1';
    const params = [];
    if (category && VALID_CATEGORIES.includes(category)) {
      where += ' AND d.category = ?';
      params.push(category);
    }
    const rows = await db.all(`
      SELECT d.id, d.slug, d.title, d.teaser, d.category, d.image_url,
             d.list_price_cents, d.merchant_name, d.badge_text, d.rating_avg, d.rating_count, d.ends_at,
             MIN(o.price_cents) AS from_price_cents
      FROM deals d
      LEFT JOIN deal_options o ON o.deal_id = d.id AND o.status = 'active'
      ${where}
      GROUP BY d.id
      ORDER BY COALESCE(d.featured_rank, 9999), d.created_at DESC
    `, params);
    const deals = rows.map(r => ({
      slug: r.slug,
      title: r.title,
      teaser: r.teaser,
      category: r.category,
      image_url: r.image_url || '/img/placeholder.jpg',
      from_price_cents: r.from_price_cents,
      list_price_cents: r.list_price_cents,
      merchant_name: r.merchant_name,
      badge_text: r.badge_text,
      rating_avg: r.rating_avg,
      rating_count: r.rating_count,
      ends_at: r.ends_at,
      discount_percent: (r.list_price_cents && r.from_price_cents && r.list_price_cents > r.from_price_cents)
        ? Math.round((1 - (r.from_price_cents / r.list_price_cents)) * 100) : null
    }));
    res.render('home', { title: 'Puerto Rico Travel Deals', deals, currentCategory: category });
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
