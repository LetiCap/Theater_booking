import db from './db.mjs';
import crypto from 'crypto';


// This function is used at log-in time to verify username and password.
const getUser = (email, password) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM users WHERE email=?';
    db.get(sql, [email], (err, row) => {
      if (err) {
        reject(err);
      } else if (row === undefined) {
        resolve(false);
      }
      else {
        const user = { id: row.id, username: row.email, name: row.name, admin: row.admin === 1, secret: row.secret, lastTotpStep: row.lastTotpStep };
        crypto.scrypt(password, row.salt, 64, function (err, hashedPassword) { 
          if (err) reject(err);
          if (!crypto.timingSafeEqual(Buffer.from(row.hash, 'hex'), hashedPassword)) 
            resolve(false);
          else
            resolve(user);
        });
      }
    });
  });
};

// This function updates the lastTotpStep for the user in the database.
const updateLastTotpStep = (userId, lastTotpStep) => {
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE users SET lastTotpStep = ? WHERE id = ?';
    db.run(sql, [lastTotpStep, userId], function (err) {
      if (err) {
        reject(err);
      }
      if (this.changes !== 1) {
        resolve({ error: 'User not found.' });
      } else {
        resolve(this.changes);
      }
    });
  });
};



export default {
  
  getUser,
  updateLastTotpStep
};