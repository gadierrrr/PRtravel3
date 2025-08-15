// SQLite database helper (replaces earlier pg usage)
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbFile = path.join(__dirname, '..', 'db', 'data.sqlite');
const connection = new sqlite3.Database(dbFile);

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
