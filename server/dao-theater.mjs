import db from './db.mjs';
import dayjs from 'dayjs';


const convertSeatFromDbRecord = (dbRecord) => {
    const seat = {}

    seat.rowLabel = dbRecord.row_label;
    seat.seatNumber = dbRecord.seat_number;
    seat.category = dbRecord.category;
    seat.reservationId = dbRecord.reservation_id;
    return seat;
};

/**
 * All seats of the theater, regardless of their reservation status.
 * @returns seats of the theater, with their category row, number, category, reservationId
 */
const getAllSeats = () => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM seats';
        db.all(sql, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const seats = rows.map((e) => {
                    const seat = convertSeatFromDbRecord(e);
                    return seat;
                });
                resolve(seats);
            }
        });
    });
};

/**
 * Return all the seats available based on the category chosen
 * @param {*} category 
 * @returns 
 */
const getFreeSeatsByCategory = (category) => {
    // Basta cercare quelli con reservation_id NULL!
    const sql = "SELECT * FROM seats WHERE category = ? AND reservation_id IS NULL ORDER BY row_label, seat_number";    
    return new Promise((resolve, reject) => {
        db.all(sql, [category], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const seats = rows.map((e) => {
                    const seat = convertSeatFromDbRecord(e);
                    return seat;
                });
                resolve(seats);
            }
        });
    });
};






/**
 * return the reserved seats based on the reservation id.
 * @param {*} reservation_id reservation id 
 * @returns seats associated with the reservation id
 */
const getReservedSeats = (reservation_id) => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT *
            FROM seats 
            WHERE reservation_id =?
        `;
        db.all(sql, [reservation_id], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const seats = rows.map((e) => convertSeatFromDbRecord(e));
                resolve(seats);
            }
        });
    });
};

/**
 * return the reservations IDs associated with a given user ID or for Admin, retrive all reservations in the DB
 * @param {*} user_id user for which to retrieve the reservation IDs
 * @returns all the reservations IDs of the user
 */
const getReservationsId = (user_id = null) => {
    return new Promise((resolve, reject) => {
        const sql = user_id
            ? 'SELECT reservation_id FROM reservations WHERE user_id = ?'
            : 'SELECT reservation_id FROM reservations';

        const params = user_id ? [user_id] : [];
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else if (rows.length === 0) {
                //return an empty array
                resolve([]);
            } else {
                const ids = rows.map((e) => e.reservation_id);
                //return array [2,4,6 ..]
                resolve(ids);
            }
        });
    });
};

/**
 * Given a reservation Id, this function retrives the user associated with
 * @param {*} reservation_id reservation Id
 * @returns {*}  id of the user or error
 */
const getOwnerByReservationId = (reservation_id) => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT user_id FROM reservations WHERE reservation_id = ?';
        db.get(sql, [reservation_id], (err, row) => {
            if (err) {
                reject(err);
            } else if (!row) {
                resolve({ error: 'User not found for the specified Reservation.' });
            } else { resolve(row.user_id); }
        });

    });
}


/**
 * add a new reservation to the 'reservations' table, 
 * @param {*} user_id user who made the reservation
 * @returns id of the new reservation created, 
 */
const insertReservation = (user_id) => {
    return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO reservations(user_id) VALUES (?)';
        db.run(sql, [user_id], function (err) {
            if (err) {
                reject(err);
            } else {
                // Return the id of the newly created reservation
                resolve(this.lastID);
            }
        });
    });
}

/**
 * Check if a specific seat is blocked for a given user (released less than 40s ago).
 * If a user deleted a seat, and an admin want to re-add the same seat before 40s, admin WILL NOT BE blocked. 
 * ONLY if the user that deleted and want to add the same seat will be blocked
 * To be called before inserting a new seat.
 * @param {*} user_id 
 * @param {*} seat seat to check
 * @returns 
 */
const isSeatBlocked = (user_id, seat) => {
    return new Promise((resolve, reject) => {
        const thresholdUnix = dayjs().unix() - 40;
        const sql = `
            SELECT 1 FROM released_seats_log 
            WHERE user_id = ? AND row_label = ? AND seat_number = ? 
            AND released_at >= ?`;
        db.get(sql, [user_id, seat.rowLabel, seat.seatNumber, thresholdUnix], (err, row) => {
            if (err) {
                reject(err);
            } else {
                // Returns true if the row exists (seat is blocked), false otherwise.
                resolve(!!row);
            }
        });
    });
}
/**
 * Update a seat in the seat table to associate it with a reservation
 * @param {*} seat seat to insert
 * @returns seat inserted
 */
const insertSeatReserved = (seat) => {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE seats SET reservation_id = ? WHERE row_label = ? AND seat_number = ? AND reservation_id IS NULL `;
        db.run(sql, [seat.reservationId, seat.rowLabel, seat.seatNumber], function (err) {
            if (err) {
                reject(err);
            } else if (this.changes === 0) {
                reject({ error: `seat ${seat.rowLabel}${seat.seatNumber} is not available or already reserved.` });
            } else {
                resolve(seat);
            }
        });
    });
};


/**
 * delete a single seat from a reservation. 
 * @param {*} seat to delete, with associated reservation id
 * @returns 1 if released, 0 otherwise
 */
const releaseSeat = (seat) => {
    return new Promise((resolve, reject) => {
        const sql = "UPDATE seats SET reservation_id = NULL WHERE row_label = ? AND seat_number = ?";
                
        db.run(sql, [seat.rowLabel, seat.seatNumber], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes);
            }
        });
    });
};


/**
 * Log a released seat in the 'released_seats_log' table to prevent it from being re-reserved for 40s
 * delete old log in the table
 * @param {*} user_id id of the user that deleted the seat
 * @param {*} seat seat to log
 * @returns 1 if correctly logged, 0 otherwise
 */
const logReleasedSeat = (user_id, seat) => {
    return new Promise((resolve, reject) => {
        const nowUnix = dayjs().unix();
        const thresholdUnix = nowUnix - 40;

        // clean old logs before inserting the new one
        const cleanupSql = "DELETE FROM released_seats_log WHERE released_at < ?";
        db.run(cleanupSql, [thresholdUnix], (cleanupErr) => {
            if (cleanupErr) {
                console.error("error in cleanup", cleanupErr);
            }
            const sql = "INSERT INTO released_seats_log (user_id, row_label, seat_number, released_at) VALUES (?, ?, ?, ?)";
            db.run(sql, [user_id, seat.rowLabel, seat.seatNumber, nowUnix], function (err) {
                if (err) {
                    reject(err);
                } else
                    resolve(this.changes);

            });
        });
    });
};

/**
 * Delete a reservation and all its associated seats thanks to ON DELETE
 * @param reservation_id  The Id of the reservation to delete.
 * @returns 1 if correctly deleted, 0 otherwise
 */
const deleteReservation = (reservation_id) => {
    return new Promise((resolve, reject) => {
        const sql = 'DELETE FROM reservations WHERE reservation_id = ?';
        db.run(sql, [reservation_id], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes);
            }
        });
    });
};


export default {
    getAllSeats,
    getFreeSeatsByCategory,
    getReservedSeats,
    getReservationsId,
    getOwnerByReservationId,
    insertReservation,
    insertSeatReserved,
    releaseSeat,
    logReleasedSeat,
    deleteReservation,
    isSeatBlocked
};