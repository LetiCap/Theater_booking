const SERVER_URL = 'http://localhost:3001/api/';

/**
 * Fetch all reservations of the user
 * @returns 
 */
async function fetchReservations() {  
  let response = await fetch(SERVER_URL + 'reservations', {
    credentials: 'include'
  });
  const reservations = await response.json();
  if (response.ok) {
    return reservations;
  } else {
    throw reservations;  
   }
}

/**
 * fetch all seats in the map with their status
 * @returns seats
 */
async function fetchSeats() {
  let response = await fetch(SERVER_URL + 'seats', {
    credentials: 'include'
  });
  const seats = await response.json();
  if (response.ok) {
    return seats;
  } else {
    throw seats;  // an object with the error coming from the server
   }
}

/**
 * fetch seats by a specific reservation id
 * @param {*} reservationId 
 * @returns seats
 */
async function fetchSeatsbyReservationId(reservationId) {
  let response = await fetch(SERVER_URL + `reservations/${reservationId}/seats`, {
    credentials: 'include'
  });
  const seats = await response.json();
  if (response.ok) {
    return seats;
  } else {
    throw seats;  // an object with the error coming from the server
   }
}

/**
 * given a reservation id, modify the reservation given a number of seats and the category desired
 * @param {*} reservationId 
 * @param {*} category 
 * @param {*} numberOfSeats 
 * @returns seats and message
 */
async function editReservation(reservationId, category, numberOfSeats) {
  let response = await fetch(SERVER_URL + `reservations/${reservationId}/seats/auto`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ category, numberOfSeats })
  });
  const result = await response.json();
  if (response.ok) {
    return result;
  } else {
    throw result;
  }
}

/**
 * modify a reservation with specific seats selected on the map
 * @param {*} reservationId 
 * @param {*} seats 
 * @returns message
 */
async function updateReservationFromMap(reservationId, seats){
  let response = await fetch(SERVER_URL + `reservations/${reservationId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ seats })
  });
  const result = await response.json();
  if (response.ok) {
    return result;
  } else {
    throw result;
  }
}

/**
 * create a reservation, with a number of seats and category desired
 * @param {*} category 
 * @param {*} numberOfSeats 
 * @returns message, seats and reservation id
 */
async function addReservation(category, numberOfSeats) {
  let response = await fetch(SERVER_URL + `reservations/auto`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ category, numberOfSeats })
  });
  const result = await response.json();
  if (response.ok) {
    return result;
  } else {
    throw result;
  }
}
/**
 * create a reservation through the map, with selected seats on it
 * @param {*} seats 
 * @returns message, seats and reservation id
 */
async function addReservationMap(seats) {
  let response = await fetch(SERVER_URL + `reservations`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ seats })
  });
  const result = await response.json();
  if (response.ok) {
    return result;
  } else {
    throw result;
  }
}

/**
 * delete a reservation
 * @param {*} reservationId 
 */
async function deleteReservation(reservationId) {
  let response = await fetch(SERVER_URL + `reservations/${reservationId}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!response.ok) {
    const errDetail = await response.json();
    throw errDetail;
  }
}




/** Login  */
async function logIn(credentials) {
  let response = await fetch(SERVER_URL + 'sessions', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  if (response.ok) {
    const user = await response.json();
    return user;
  } else {
    const errDetail = await response.json();
    throw errDetail
  }
}


function totpVerify(totpCode) {
  // call  POST /api/login-totp
  return new Promise((resolve, reject) => {
    fetch(SERVER_URL + `login-totp`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: totpCode }),
    }).then((response) => {
      if (response.ok) {
        response.json()
          .then((user) => resolve(  user)) // user info in the response body
          .catch(() => { reject({ error: "Cannot parse server response." }) }); 
      } else {
        // analyze the cause of error
        response.json()
          .then((message) => { reject(message); }) // error message in the response body
          .catch(() => { reject({ error: "Cannot parse server response." }) }); 
      }
    }).catch(() => { reject({ error: "Cannot communicate with the server." }) }); // connection errors
  });
}

/**
* This function is used to verify if the user is still logged-in.
* It returns a JSON object with the user info.
*/
async function getUserInfo() {
  const response = await fetch(SERVER_URL + 'sessions/current', {
    // this parameter specifies that authentication cookie must be forwarded
    credentials: 'include'
  })
  const userInfo = await response.json();
  if (response.ok) {
    return userInfo;
  } else {
    throw userInfo;  // an object with the error coming from the server
  }
};

async function logOut() {
  await fetch(SERVER_URL + 'sessions/current', {
    method: 'DELETE',
    credentials: 'include'
  })

}


const API = { logIn, totpVerify, getUserInfo, logOut, fetchReservations,
   deleteReservation, addReservation, editReservation, fetchSeats, updateReservationFromMap,
   addReservationMap, fetchSeatsbyReservationId} 
export default API;

