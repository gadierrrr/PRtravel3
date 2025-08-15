#!/usr/bin/env node
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbFile = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  const upsertUser = db.prepare('INSERT OR IGNORE INTO users (email, name, role) VALUES (?,?,?)');
  upsertUser.run('demo@example.com', 'Demo User', 'user');
  upsertUser.run('admin@example.com', 'Admin User', 'admin');
  upsertUser.finalize();

  const baseTime = new Date().toISOString();
  const future = new Date(Date.now()+ 3*24*3600*1000).toISOString();
  const deals = [
    { slug: 'oceanfront-escape', title: 'Oceanfront Escape', merchant_name: 'Isla Azul Resort', teaser: '2 nights by the sea', description_md: '### Ocean View\nRelax by the coast.', fine_print_md: '*Some restrictions apply.*', category: 'hotel', subcategory: null, tags: 'beach,relax', image_url: 'https://placehold.co/600x400?text=Ocean', city: 'San Juan', state: 'PR', address_text: '123 Beachfront Ave', postal_code: '00901', lat: 18.4655, lng: -66.1057, rating_avg: 4.7, rating_count: 128, promo_code: 'ISLA20', promo_note: 'with code ISLA20', ends_at: future, reviews_url: 'https://example.com/reviews/oceanfront', badge_text: 'Limited time', publish_at: baseTime, start_at: baseTime, end_at: null, is_active: 1, featured_rank: 1, list_price_cents: 45000 },
    { slug: 'rainforest-hike', title: 'Rainforest Hike', merchant_name: 'El Yunque Guides', teaser: 'Guided El Yunque adventure', description_md: 'Explore nature.', fine_print_md: 'Bring water.', category: 'experience', subcategory: 'hiking', tags: 'adventure,nature', image_url: 'https://placehold.co/600x400?text=Hike', city: 'Rio Grande', state: 'PR', rating_avg: 4.9, rating_count: 340, promo_note: 'Family friendly', publish_at: baseTime, start_at: baseTime, end_at: null, is_active: 1, featured_rank: 2, list_price_cents: 12000 },
    { slug: 'salsa-night', title: 'Salsa Night', merchant_name: 'Rhythm Studio', teaser: 'Dance class + social', description_md: 'Learn salsa basics.', fine_print_md: 'Wear comfy shoes.', category: 'experience', subcategory: 'dance', tags: 'music,dance', image_url: 'https://placehold.co/600x400?text=Salsa', city: 'Ponce', state: 'PR', badge_text: 'Popular', publish_at: baseTime, start_at: baseTime, end_at: null, is_active: 1, featured_rank: 3, list_price_cents: 8000 },
    { slug: 'gourmet-tasting', title: 'Gourmet Tasting', merchant_name: 'Chef Marisol', teaser: '5-course fusion dinner', description_md: 'Chef curated menu.', fine_print_md: 'Subject to availability.', category: 'restaurant', subcategory: null, tags: 'food,fine-dining', image_url: 'https://placehold.co/600x400?text=Dining', city: 'San Juan', state: 'PR', rating_avg: 4.5, rating_count: 62, promo_code: 'EATS10', publish_at: baseTime, start_at: baseTime, end_at: null, is_active: 1, featured_rank: 4, list_price_cents: 16000 },
    { slug: 'sunset-cruise', title: 'Sunset Cruise', merchant_name: 'Bay Adventures', teaser: 'Evening bay cruise', description_md: 'Romantic sunset.', fine_print_md: 'Weather dependent.', category: 'experience', subcategory: 'boat', tags: 'sunset,romance', image_url: 'https://placehold.co/600x400?text=Cruise', city: 'Fajardo', state: 'PR', rating_avg: 4.8, rating_count: 210, publish_at: baseTime, start_at: baseTime, end_at: null, is_active: 1, featured_rank: 5, list_price_cents: 20000 },
    { slug: 'historic-walking-tour', title: 'Historic Walking Tour', merchant_name: 'Heritage Walks', teaser: 'Old San Juan highlights', description_md: 'Guided cultural tour.', fine_print_md: 'Comfortable shoes.', category: 'experience', subcategory: 'tour', tags: 'history,culture', image_url: 'https://placehold.co/600x400?text=Tour', city: 'San Juan', state: 'PR', reviews_url: 'https://example.com/reviews/historic-tour', publish_at: baseTime, start_at: baseTime, end_at: null, is_active: 1, featured_rank: 6, list_price_cents: 10000 }
  ];

  const dealStmt = db.prepare(`INSERT OR IGNORE INTO deals (
    slug, title, merchant_name, teaser, description_md, fine_print_md, category, subcategory, tags, image_url, address_text, city, state, postal_code, lat, lng,
    rating_avg, rating_count, promo_code, promo_note, ends_at, reviews_url, badge_text,
    publish_at, start_at, end_at, is_active, featured_rank, list_price_cents
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  const optStmt = db.prepare(`INSERT OR IGNORE INTO deal_options (
    deal_id, name, sku, price_cents, original_price_cents, total_stock, sold_count, per_user_limit,
    min_qty, max_qty, status
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

  deals.forEach(d => {
    dealStmt.run(d.slug, d.title, d.merchant_name || null, d.teaser, d.description_md, d.fine_print_md, d.category, d.subcategory, d.tags, d.image_url, d.address_text || null, d.city || null, d.state || null, d.postal_code || null, d.lat || null, d.lng || null,
      d.rating_avg || null, d.rating_count || null, d.promo_code || null, d.promo_note || null, d.ends_at || null, d.reviews_url || null, d.badge_text || null,
      d.publish_at, d.start_at, d.end_at, d.is_active, d.featured_rank, d.list_price_cents);
  });

  dealStmt.finalize(() => {
    let remaining = deals.length;
    deals.forEach(d => {
      db.get('SELECT id, list_price_cents FROM deals WHERE slug = ?', [d.slug], (err, row) => {
        if (row) {
          optStmt.run(row.id, 'Standard', null, Math.round(row.list_price_cents * 0.8), row.list_price_cents, 100, 0, 2, 1, 10, 'active');
        }
        if (--remaining === 0) {
          optStmt.finalize(() => {
            console.log('Seed data inserted (idempotent).');
            db.close();
          });
        }
      });
    });
  });
});
