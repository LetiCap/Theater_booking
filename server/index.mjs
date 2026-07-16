'use strict';

import express from 'express';
import morgan from 'morgan';
import { check, validationResult } from 'express-validator';
import cors from 'cors';
import passport from 'passport';
import LocalStrategy from 'passport-local';

import userDao from './dao-users.mjs';
import theaterDao from './dao-theater.mjs';

import { TOTP } from 'otpauth';
import session from 'express-session';

// init express
const app = express();
const port = 3001;

app.use(morgan('dev'));
app.use(express.json());


const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

passport.use(new LocalStrategy(async function verify(username, password, callback) {
  const user = await userDao.getUser(username, password)
  if (!user){
    return callback(null, false, 'Incorrect username or password');
  }
  return callback(null, user);
}));

// Serializing in the session the user object given from LocalStrategy(verify).
passport.serializeUser(function (user, callback) {
  callback(null, user);
});

// Starting from the data in the session, we extract the current (logged-in) user.
passport.deserializeUser(function (user, callback) {
  return callback(null, user);
});


/** Session Part */

app.use(session({
  secret: '254c37f46b19d0684d5a9bde0a0f007b',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.authenticate('session'));


function verifyTotpToken(user, token) {
  const totp = new TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: user.secret
  });



  // Validate the code
  const delta = totp.validate({ token, window: 1 });
  if (delta === null) {
    return false; // invalid code
  }
  const currentCounter = totp.counter();
  const actualStep = currentCounter + delta;

  if (actualStep <= user.lastTotpStep)
    return false;  // Reject replay or older step

  // Accept : update last-used step
  user.lastTotpStep = actualStep;
  return true;
}

/** Authentication verification middleware **/
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: 'Not authenticated' });
}

const maxTitleLength = 160;
//  to format express-validator errors as strings
const errorFormatter = ({ location, msg, param, value, nestedErrors }) => {
  return `${location}[${param}]: ${msg}`;
};
const validateRequest = (req, res, next) => {
  const errors = validationResult(req).formatWith(errorFormatter);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array()[0] });
  }
  next();
};

/** function to check if an admin chose to authenticate as admin */
const isUserActiveAdmin = (req) => {
  return req.user && req.user.admin === true && !!req.user.secret && req.session.method === 'totp';
};

/** Middleware to block admin that try to have acces to some functionality reserved only to normal user */
const onlyNotAdmin = (req, res, next) => {
  if (isUserActiveAdmin(req)) {
    return res.status(403).json({ error: "Authorization denied for admin users" });
  }
  next();
};

/**Middleware that verify if the user is an admin.
 * if true, admin can go ahead. if false, the user can have access only to his/her reservation, 
 * so we check if she/he is the owner of reservation
 */
const canManageReservation = async (req, res, next) => {
 if (isUserActiveAdmin(req)) {
    return next();
  }
  try {
    const owner_id = await theaterDao.getOwnerByReservationId(req.params.id);
    if (owner_id.error) {
      // reservation doesn't exist
      return res.status(404).json(owner_id); 
    }
    if (owner_id !== req.user.id) {
      // reservation exist but belong to another user
      return res.status(403).json({ error: "Authorization denied." }); 
    }
    next();
  } catch (err) {
    res.status(500).json({ error: "Database Internal Error" });
  }
};


/**
 * function to allocate the seat randomly. fetch the freeSeats by category
 * search if there are enough seats and if they are on the same row
 * return the seats selected
 */
const allocateSeats = async (requestedCount, requestedCategory, userId) => {
  const freeSeats = await theaterDao.getFreeSeatsByCategory(requestedCategory);
  //search for each seat, which of them is blocked due to 40s rule
  const blockChecks = await Promise.all(
    freeSeats.map(seat => theaterDao.isSeatBlocked(userId, seat))
  );
  //filtering the free seats with the one blocked
  const availableSeats = freeSeats.filter((seat, index) => !blockChecks[index]);
  if (availableSeats.length < requestedCount) {
    return { error: `Not enough available seats in the '${requestedCategory}' category.` };
  }
  // grouping in array by the rowLabel
  
  /*"A": [
    { "rowLabel": "A", "seatNumber": 1, "category": "premium" },
    { "rowLabel": "A", "seatNumber": 2, "category": "premium" }
  ],
  */
  const seatsByRow = {};
  for (const seat of availableSeats) {
    if (!seatsByRow[seat.rowLabel]) seatsByRow[seat.rowLabel] = [];
    seatsByRow[seat.rowLabel].push(seat);
  }
  let selectedSeats = [];
  //seach in each array of seats, if there is a row with enough seats available
  for (const row in seatsByRow) {
    if (seatsByRow[row].length >= requestedCount) {
      //take N seats in the row considered
      selectedSeats = seatsByRow[row].slice(0, requestedCount);
      break;
    }
  }
  //if any rows has enough seats, we take seats where available
  if (selectedSeats.length === 0) {
    selectedSeats = availableSeats.slice(0, requestedCount);
  }
  return { seats: selectedSeats };
};



/** Users API */

function clientUserInfo(req) {
  const user = req.user;
  const isUserAdmin = user.admin === true && !!user.secret;
  const isActiveAdmin = isUserAdmin && req.session.method === 'totp';
  return { id: user.id, email: user.email, name: user.name, isAdmin: isUserAdmin , activeAdmin: isActiveAdmin };
}


// POST /api/sessions 
// This route is used for performing login.
app.post('/api/sessions', function (req, res, next) {
  passport.authenticate('local', (err, user, info) => {
    if (err)
      return next(err);
    if (!user) {
      return res.status(401).json({ error: info });
    }
    // success, perform the login and extablish a login session
    req.login(user, (err) => {
      if (err)
        return next(err);

      //authentication complete without 2FA
      req.session.method = 'password';
      // if the user request to login as admin, the server responds with require2FA: true, and the client will ask for the TOTP code with the call /api/login-totp
      if (user.admin === true && req.body.loginAsAdmin === true) {
        return res.status(200).json({ required2FA: true, user: clientUserInfo(req) });
      }
      
      // req.user contains the authenticated user, we send all the user info back, even if normal user tried to have access as admin
      //we handle the error in frontend
      return res.json(clientUserInfo(req));
    });
  })(req, res, next);
});

app.post('/api/login-totp', isLoggedIn,
  async (req, res) => {
    if (!req.user.secret) {
      return res.status(400).json({ error: 'Cannot authenticate with TOTP' });
    }
    const success = verifyTotpToken(req.user, req.body.code);
    if (success) {
      req.session.method = 'totp';
      // STORE lastTotpStep in DB for replay protection
      try {
        await userDao.updateLastTotpStep(req.user.id, req.user.lastTotpStep);
      } catch (err) {
        return res.status(503).json({ error: 'Database error' });
      }
      return res.json(clientUserInfo(req));
    } else {
      return res.status(401).json({ error: 'Cannot authenticate with TOTP' });
    }
  }
);

/** Sessions API */
// DELETE /api/sessions/current
// This route is used for loggin out the current user.
app.delete('/api/sessions/current', (req, res) => {
  req.logout(() => {
    res.status(200).json({});
  });
});

// GET /api/sessions/current
// This route checks whether the user is logged in or not.
app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json(clientUserInfo(req));
  }
  else
    res.status(401).json({ error: 'Not authenticated' });
});


/** Theater API */

// GET /api/seats
// This route returns the list of all seats with their status (occupied or not) and reservation id if occupied.
app.get('/api/seats', async (req, res) => {
  try {
    const seatsMap = await theaterDao.getAllSeats();
    res.status(200).json(seatsMap);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database Internal Error" });
  }
});

// GET /api/reservations
// This route returns the list of resevation of the current user or if activeAdmin, of all the users
app.get('/api/reservations', isLoggedIn, async (req, res) => {
  try {
   
    // If active admin, get all reservations, otherwise only the ones of the user
    const reservations = isUserActiveAdmin(req) ?
      await theaterDao.getReservationsId() :
      await theaterDao.getReservationsId(req.user.id);
    res.status(200).json(reservations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database Internal Error" });
  }
})

//GET /api/reservations/:id/seats
// This route returns the list of seats associated with a reservation id
//canManagereservation avoid a user to add a specific id of another user in the URL, and perform an admin action
app.get('/api/reservations/:id/seats', isLoggedIn,
  [check('id').isInt({ min: 1 })], validateRequest, canManageReservation,
  async (req, res) => {
    try {
      const seats = await theaterDao.getReservedSeats( req.params.id);
      res.status(200).json(seats);
    } catch (err) {
      console.error(err);
      res.status(500).json({error: 'Database Internal Error'});
    }
  }
);

// POST /api/reservations
//This route create a new reservation with a list of seats specified, specified through the map
app.post('/api/reservations', isLoggedIn, onlyNotAdmin,
  [
    check('seats').isArray({ min: 1 }).withMessage('Must provide at least one seat'),
    check('seats.*.category').isString().isIn(['normal', 'premium']).withMessage('Category must be either normal or premium'),
    check('seats.*.rowLabel').isString().matches(/^[A-Z]$/).withMessage('Row must be a single uppercase letter'),
    check('seats.*.seatNumber').isInt({ min: 1 }).withMessage('Seat number must be a positive integer')
  ], validateRequest,
  async (req, res) => {

    try {
      const seatsToReserve = req.body.seats;
      
      // check if seats selected are occupied by others
      const allSeatsInDb = await theaterDao.getAllSeats(); 
      for (const seat of seatsToReserve) {
        const dbSeat = allSeatsInDb.find(s => s.rowLabel === seat.rowLabel && s.seatNumber === seat.seatNumber);
        if (dbSeat && dbSeat.reservationId !== null) {
            // seat is already taken
            return res.status(409).json({ 
                error: `Seat ${seat.rowLabel}${seat.seatNumber} was just taken by someone else.`
            });
        }
      }

      // 40s rule
      //check which seats are blocked
      const blockChecks = await Promise.all(
        seatsToReserve.map(seat => theaterDao.isSeatBlocked(req.user.id, seat))
      );
      //find in the array of boolean of seats(true if blocked) the first seat requested as blocked
      const blockedIndex = blockChecks.findIndex(isBlocked => isBlocked);
      if (blockedIndex !== -1) {
        const blockedSeat = seatsToReserve[blockedIndex];
        // alert which seat requested is blocked
        return res.status(409).json({
          error: `Seat ${blockedSeat.rowLabel}${blockedSeat.seatNumber} is temporarily blocked`
        });
      }

      //after the 40s rule check, we create a reservation
      const newReservationId = await theaterDao.insertReservation(req.user.id);

      const confirmedSeats = [];
      for (const seat of seatsToReserve) {
        const seatParam = {
          reservationId: newReservationId,
          rowLabel: seat.rowLabel,
          seatNumber: seat.seatNumber,
          category: seat.category
        };

        //insert the seats of reservation
        try {
          const insertedSeat = await theaterDao.insertSeatReserved(seatParam);
          confirmedSeats.push(insertedSeat);
        } catch (dbError) {
          // check if seats selected are occupied
          await theaterDao.deleteReservation(newReservationId);
          return res.status(409).json({ error: dbError.error });
        }
      }
      res.status(201).json({
        message: "Reservation created successfully",
        reservationId: newReservationId,
        seats: confirmedSeats
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database Internal Error' });
    }
  }
);


// POST /api/reservations/auto
// This route creates a new reservation with a list of seats automatically assigned by the system, specified by number of seats and category
app.post('/api/reservations/auto', isLoggedIn, onlyNotAdmin,
  [
    check('numberOfSeats').isInt({ min: 1 }).withMessage('Must request at least 1 seat'),
    check('category').isString().isIn(['normal', 'premium']).withMessage('Category must be either normal or premium')
  ],
  validateRequest,
  async (req, res) => {
    try {
     
      const { numberOfSeats, category } = req.body;

      //search the seats in a single row
      const allocation = await allocateSeats(numberOfSeats, category, req.user.id);
      if (allocation.error) {
        return res.status(400).json({ error: allocation.error });
      }

      // create reservation
      const newReservationId = await theaterDao.insertReservation(req.user.id);
      const confirmedSeats = [];

      //for each seat, we concatenate the reservation id
      for (const seat of allocation.seats) {
        const seatParam = { ...seat, reservationId: newReservationId };
        try {
          const insertedSeat = await theaterDao.insertSeatReserved(seatParam);
          confirmedSeats.push(insertedSeat);
        } catch (dbError) {
          // in case of race condition, rollback reservation
          await theaterDao.deleteReservation(newReservationId);
          return res.status(409).json({ error: dbError.error});
        }
      }

      res.status(201).json({
        message: "Reservation created successfully",
        reservationId: newReservationId,
        seats: confirmedSeats
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database Internal Error' });
    }
  }
);



// PUT /api/reservations/:id
// Update a specific reservation by map. Add and delete seats by map
app.put('/api/reservations/:id', isLoggedIn, 
  [
    check('id').isInt({ min: 1 }),
    check('seats').isArray({ min: 1 }).withMessage('Must provide at least one seat'),
    check('seats.*.category').isString().isIn(['normal', 'premium']).withMessage('Category must be either normal or premium'),
    check('seats.*.rowLabel').isString().matches(/^[A-Z]$/).withMessage('Row must be a single uppercase letter'),
    check('seats.*.seatNumber').isInt({ min: 1 }).withMessage('Seat number must be a positive integer')
  ], validateRequest, canManageReservation,
  async (req, res) => {
    try {
      const reservationId = req.params.id;
      const desiredSeats = req.body.seats;
      const currentSeats = await theaterDao.getReservedSeats(reservationId);

      const toRemove = currentSeats.filter(curr => 
        !desiredSeats.some(d => d.rowLabel === curr.rowLabel && d.seatNumber === curr.seatNumber)
      );

      const toAdd = desiredSeats.filter(des => 
        !currentSeats.some(c => c.rowLabel === des.rowLabel && c.seatNumber === des.seatNumber)
      );


      // check if seats selected are occupied by others
      const allSeatsInDb = await theaterDao.getAllSeats(); 
      for (const seat of toAdd) {
        const dbSeat = allSeatsInDb.find(s => s.rowLabel === seat.rowLabel && s.seatNumber === seat.seatNumber);
        if (dbSeat && dbSeat.reservationId !== null) {
            // seat is already taken
            return res.status(409).json({ 
                error: `Seat ${seat.rowLabel}${seat.seatNumber} was just taken by someone else.`
            });
        }
      }

      // 40s rule
      //check which seats are blocked
      const blockChecks = await Promise.all(
        toAdd.map(seat => theaterDao.isSeatBlocked(req.user.id, seat))
      );

      //find in the array of boolean of seats(true if blocked) the first seat requested as blocked
      const blockedIndex = blockChecks.findIndex(isBlocked => isBlocked);
      if (blockedIndex !== -1) {
        const blockedSeat = toAdd[blockedIndex];
        return res.status(409).json({ 
          // alert which seat requested is blocked
          error: `Seat ${blockedSeat.rowLabel}${blockedSeat.seatNumber} is temporarily blocked` 
        });
      }
      

      // delete seats and add to log table
      for (const seat of toRemove) {
        await theaterDao.releaseSeat(seat);
        await theaterDao.logReleasedSeat(req.user.id, seat);
      }
      
      for (const seat of toAdd) {
       //add seats to reservation
        await theaterDao.insertSeatReserved({ ...seat, reservationId : reservationId });
      }

      res.status(200).json({  message: "Reservation updated successfully" });
    } catch (err) {
      res.status(500).json({ error: "Database Internal Error" });
    }
  }
);

//this route add to a reservation, random seats based on the numebr of seats and the category
// POST /api/reservations/:id/seats/auto
app.post('/api/reservations/:id/seats/auto', isLoggedIn,
  [
    check('id').isInt({ min: 1 }),
    check('numberOfSeats').isInt({ min: 1 }).withMessage('Must request at least 1 seat'),
    check('category').isString().isIn(['normal', 'premium']).withMessage('Category must be either normal or premium')
  ],
  validateRequest,
  canManageReservation,
  async (req, res) => {
    try {
      const { numberOfSeats, category } = req.body;

      //search the seats in a single row
      const allocation = await allocateSeats(numberOfSeats, category, req.user.id);
      if (allocation.error) {
        return res.status(400).json({ error: allocation.error });
      }

      const addedInThisRequest = [];
      //for each seat, we concatenate the reservation id
      for (const seat of allocation.seats) {
        const seatParam = { ...seat, reservationId: req.params.id };
        try {
          const insertedSeat = await theaterDao.insertSeatReserved(seatParam);
          addedInThisRequest.push(insertedSeat);
        } catch (dbError) {
          // in case of race condition, rollback seats
          for (const addedSeat of addedInThisRequest) {
            await theaterDao.releaseSeat(addedSeat);
          }
           return res.status(409).json({ error: dbError.error});
        }
      }

      res.status(201).json({
        message: "Auto-assigned seats added successfully",
        seats: addedInThisRequest
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database Internal Error' });
    }
  }
);


// DELETE /api/reservations/:id
//this route delete a specific reservation
app.delete('/api/reservations/:id', isLoggedIn,
  [check('id').isInt({ min: 1 })], validateRequest, canManageReservation,
  async (req, res) => {
    try {
      //Get all seats of reservation to delete
      const seatsToRelease = await theaterDao.getReservedSeats( req.params.id);
      //delete the, and to 
      const numChanges = await theaterDao.deleteReservation(req.params.id);

      //avoiding fast double click
      if (numChanges === 0) {
        return res.status(404).json({ error: "Reservation not found." });
      }

      //save them in the table of log, for the 40 seconds rule
      for (const seat of seatsToRelease) {
        await theaterDao.logReleasedSeat(req.user.id, seat);
      }
     
      res.status(200).json({ numChanges });
      
    } catch (err) {
      res.status(500).json({ error: 'Database Internal Error' });
    }
  }
);


// activate the server
app.listen(port, (err) => {
  if (err)
    console.log(err);
  else
    console.log(`Server listening at http://localhost:${port}`);
}); 
