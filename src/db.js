// SQLite database helper (replaces earlier pg usage)
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbFile = path.join(__dirname, '..', 'db', 'data.sqlite');
const connection = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    // eslint-disable-next-line no-console
    console.error('SQLite connection error:', err.message);
  } else {
    // Enforce foreign key constraints for every connection
    connection.run('PRAGMA foreign_keys = ON;', (e) => {
      if (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to enable foreign_keys pragma:', e.message);
      }
    });
  }
});

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

async function query(sql, params = []) {
  // simple heuristic: if begins with select return rows else run
  if (/^\s*select/i.test(sql)) {
    const rows = await all(sql, params);
    return { rows };
  }
  const result = await run(sql, params);
  return { result };
}

module.exports = { all, get, run, query, connection };
