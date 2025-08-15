const express = require('express');
const router = express.Router();
const db = require('../db');
let stripe = null;
if (process.env.STRIPE_ENABLED === 'true' && process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
}

// Raw body middleware for Stripe signature verification
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || process.env.STRIPE_ENABLED !== 'true') return res.status(400).end();
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata && session.metadata.order_id;
    if (orderId) {
      // Mark paid and set totals (subtotal == total for MVP)
      await db.run('UPDATE orders SET status=?, total_cents=?, subtotal_cents=? WHERE id=?', ['paid', session.amount_total, session.amount_subtotal || session.amount_total, orderId]);
    }
  }
  res.json({ received: true });
});

module.exports = router;
