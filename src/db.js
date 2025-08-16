// SQLite database helper (replaces earlier pg usage)
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const fs = require('fs');
const dbDir = path.join(__dirname, '..', 'db');
const dbFile = path.join(dbDir, 'data.sqlite');
const connection = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    // eslint-disable-next-line no-console
    console.error('SQLite connection error:', err.message);
  } else {
    connection.run('PRAGMA foreign_keys = ON;', (e) => {
      if (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to enable foreign_keys pragma:', e.message);
      } else if (process.env.NODE_ENV !== 'production') {
        // Fetch status then log
        connection.get('PRAGMA foreign_keys;', (e2, row) => {
          const fkStatus = row && row.foreign_keys;
          // Detect stray .sqlite files (besides sessions.sqlite & data.sqlite)
          let extraSqliteWarning = '';
          try {
            const files = fs.readdirSync(dbDir).filter(f => f.endsWith('.sqlite'));
            const extras = files.filter(f => !['data.sqlite','sessions.sqlite'].includes(f));
            if (extras.length > 0) {
              extraSqliteWarning = ' (WARNING: Multiple .sqlite files found; using data.sqlite)';
            }
          } catch {/* ignore */}
          // eslint-disable-next-line no-console
            console.log(`DB connected: ${dbFile} • foreign_keys=${fkStatus}${extraSqliteWarning}`);
        });
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
