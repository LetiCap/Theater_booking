/** DB access module **/

import sqlite from 'sqlite3';

// open the database
const db = new sqlite.Database('theater.db', (err) => {
  if (err) throw err;
});

db.run("PRAGMA foreign_keys = ON;", (err) => {
  if (err) {
      console.error("Error enabling foreign keys:", err);
  }
});

export default db;