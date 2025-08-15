const express = require('express');
const router = express.Router();
const db = require('../db');
let stripe = null;
if (process.env.STRIPE_ENABLED === 'true' && process.env.STRIPE_SECRET_KEY) {
	stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
}

function ensureUser(req, res, next) {
	if (req.user) return next();
	return res.status(401).json({ error: 'Login required' });
}

// Create Checkout Session
router.post('/checkout/session', ensureUser, async (req, res, next) => {
	if (process.env.STRIPE_ENABLED !== 'true') {
		return res.status(400).json({ error: 'Stripe disabled' });
	}
	try {
		const { option_id, qty } = req.body;
		const quantity = parseInt(qty, 10) || 1;
		if (!option_id || quantity < 1) return res.status(400).json({ error: 'Invalid input' });
		const option = await db.get(`SELECT o.*, d.title as deal_title, d.slug, d.category FROM deal_options o INNER JOIN deals d ON d.id=o.deal_id WHERE o.id=? AND o.status='active' AND d.is_active=1`, [option_id]);
		if (!option) return res.status(404).json({ error: 'Option not found' });
		const unit = option.price_cents;
		const subtotal = unit * quantity;
		// Insert order (status created)
		const orderInsert = await db.run(`INSERT INTO orders (user_id, status, subtotal_cents, total_cents) VALUES (?,?,?,?)`, [req.user.id, 'created', subtotal, subtotal]);
		const orderId = orderInsert.lastID;
		await db.run(`INSERT INTO order_items (order_id, deal_id, deal_option_id, qty, unit_price_cents, original_price_cents, deal_title_snapshot, option_name_snapshot) VALUES (?,?,?,?,?,?,?,?)`, [orderId, option.deal_id, option.id, quantity, unit, option.original_price_cents || null, option.deal_title, option.name]);
		// Create Stripe Checkout Session
		const session = await stripe.checkout.sessions.create({
			mode: 'payment',
			line_items: [{
				price_data: {
					currency: 'usd',
					unit_amount: unit,
					product_data: { name: option.deal_title + ' - ' + option.name }
				},
				quantity: quantity
			}],
			metadata: { order_id: String(orderId) },
			success_url: `${req.protocol}://${req.get('host')}/account?success=1`,
			cancel_url: `${req.protocol}://${req.get('host')}/deal/${option.slug}?canceled=1`
		});
		await db.run('UPDATE orders SET stripe_session_id=? WHERE id=?', [session.id, orderId]);
		res.json({ id: session.id, url: session.url });
	} catch (e) { next(e); }
});

module.exports = router;
