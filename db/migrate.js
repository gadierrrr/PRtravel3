#!/usr/bin/env node
// SQLite migration (idempotent) using sqlite3
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbFile = path.join(__dirname, 'data.sqlite');
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

const db = new sqlite3.Database(dbFile);
db.serialize(() => {
	db.run('PRAGMA foreign_keys = ON;');
	db.exec(schema, (err) => {
		if (err) {
			console.error('Migration failed:', err);
			process.exit(1);
		} else {
			// Add new nullable columns to deals if not present
			const needed = [
				['merchant_name','TEXT'],
				['address_text','TEXT'],
				['state','TEXT'],
				['postal_code','TEXT'],
				['rating_avg','REAL'],
				['rating_count','INTEGER'],
				['promo_code','TEXT'],
				['promo_note','TEXT'],
				['ends_at','DATETIME'],
				['reviews_url','TEXT'],
				['badge_text','TEXT']
			];
			db.all("PRAGMA table_info(deals)", (e, rows) => {
				if (e) { console.error('PRAGMA failed', e); return finish(); }
				const existing = new Set(rows.map(r=>r.name));
				const pending = needed.filter(([col]) => !existing.has(col));
				(function addNext(){
					if (!pending.length) return finish();
					const [col,type] = pending.shift();
					db.run(`ALTER TABLE deals ADD COLUMN ${col} ${type}`, err2 => {
						if (err2) console.error('Add column failed (ignored if already exists):', col, err2.message);
						addNext();
					});
				})();
				function finish(){
					console.log('SQLite migration completed (idempotent).');
					db.close();
				}
			});
		}
	});
});
