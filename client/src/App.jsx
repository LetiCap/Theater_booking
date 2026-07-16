import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import { useEffect, useState } from 'react';
import { Col, Container, Row, Navbar, Button, Alert } from 'react-bootstrap';
import { Routes, Route, Outlet, Link, Navigate, useNavigate } from 'react-router';
import { DefaultRoute, GenericLayout, Reservations, EditLayout, HomeLayout } from './components/Layout.jsx';
import { LoginForm, TotpForm } from './components/AuthComponents.jsx';
import { SeatMap } from './components/MapComponent.jsx';
import './App.css'
import API from './API.js';



function App() {
  const navigate = useNavigate();  // To be able to call useNavigate, the component must already be in BrowserRouter, done in main.jsx  // This state keeps track if the user is currently logged-in. true when the user completed the login, without TOTP
  const [loggedIn, setLoggedIn] = useState(false);
  // This state contains the user's info.
  const [user, setUser] = useState(null);
  //to keep track if the user completed totp verification phase. true for simple user after login
  const [authCompleted, setAuthCompleted] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [seats, setSeats] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);

  const [message, setMessage] = useState('');


  //fetch seats map and check user authentication status on mount
  useEffect(() => {
    refreshSeats()
    const checkAuth = async () => {
      try {
        // here you have the user info, if already logged in
        const user = await API.getUserInfo();
        setLoggedIn(true);
        setUser(user);
        setAuthCompleted(true);
        refreshReservations();

      } catch (err) {
        //if not already logged, stop here the spinner. otherwise will be stopped in refreshReservations()
        setInitialLoading(false);
      }
    }
    checkAuth();
  }, []);

/**have error on screen for 5 second */
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      /* to handle possibile concurrent error. when a first error comes, start the timer.
       if another errors comes and the first error finish, 
       avoid the possibility to delete the second one, through setMessage(null)
       */
      return () => clearTimeout(timer);
    }
  }, [message]);

  

/*keep refreshing seats to have sinchronization*/
  useEffect(() => {
    if (loggedIn) {
      const intervalId = setInterval(() => {
        refreshSeats();
        refreshReservations();
      }, 5000); 
      return () => clearInterval(intervalId);
    }
  }, [loggedIn]);


  /** Handle of errors */
  const handleErrors = (err) => {

    let errMsg = 'Unkwnown error';
    if (err.error) {
      errMsg = err.error;
    } else if (err.errors && err.errors[0].msg) {
      errMsg = err.errors[0].msg;
    } else if (err.message) {
      errMsg = err.message;
    }
    setMessage(errMsg);

    if (errMsg === 'Not authenticated') {
      setUser(null);
      setLoggedIn(false);
      return
    }
    setTimeout(() => {
      refreshSeats();
      //refresh reservation only if logged
      if (loggedIn) {
        refreshReservations();
      }
    }, 2000);  // Fetch the current version from server, after a while
  }


  /**----- FUNCTION ------*/

  /** Refresh the list of reservations */
  const refreshReservations = () => {
    API.fetchReservations()
      .then((data) => {
        setReservations(data);
      })
      .catch((err) => {
        handleErrors(err);
      })
      .finally(() => setInitialLoading(false));
  }

  /** Refresh the list of seats */
  const refreshSeats = () => {
    API.fetchSeats()
      .then((data) => {
        setSeats(data);
      })
      .catch((err) => {
        handleErrors(err);
      });
  }


  /**Handle Login 
   * if 2FA is required, the user info is stored in the state but auth is not completed
  */
  const handleLogin = async (credentials) => {
    try {
      const result = await API.logIn(credentials);
      if (result.required2FA) {
        setUser(result.user);
        setLoggedIn(true);
        // base login is successful, but 2FA is required by the user, so we don't have auth fully completed
        setAuthCompleted(false);
      } else {
        //if login complete, refresh
        setUser(result);
        setLoggedIn(true);
        setAuthCompleted(true);
        //normal user tried to have access as admin
        if (credentials.loginAsAdmin === true && result.isAdmin === false) {
          setMessage("Logged in, access as Admin denied");
        }

        refreshReservations();
        refreshSeats();

      }
    } catch (err) {
      // error is handled and visualized in the login form
      throw err;
    }
  };


  /** Handle Logout */
  const handleLogout = async () => {
    try {
      await API.logOut();
    } catch (err) {
    } finally {
      setLoggedIn(false);
      setAuthCompleted(false);
      // clean up everything
      setUser(null);
      setMessage('');
      setReservations([]);
    }
  };


  /** Handle Delete Reservation */
  const deleteReservation = (reservationId) => {
    setDisabled(true)
    return API.deleteReservation(reservationId)
      .then(() => {
        refreshReservations();
        refreshSeats();
        navigate('reservations/'); 
      })
      .catch((err) => {
        handleErrors(err);
        //notify to the component that call it, the presence of error
        throw err;
      })
      .finally(() => {
        setDisabled(false)
      });
  }


  /** Handle edit Reservation */
  const editReservation = (reservationId, category, numberOfSeats) => {
    return API.editReservation(reservationId, category, numberOfSeats)
      .then(() => {
        refreshSeats();
        navigate('/reservations');
      })
      .catch((err) => {
        handleErrors(err);
        throw err;
      })
  }


  /** Handle add Reservation through map*/
  const addReservationMap = (seats) => {
    return API.addReservationMap(seats)
      .then(() => {
        refreshReservations();
        refreshSeats();
        navigate('/reservations');
      })
      .catch((err) => {
        handleErrors(err);
        throw err;

      })
  }

  /** Handle add Reservation */
  const addReservation = (category, numberOfSeats) => {
    return API.addReservation(category, numberOfSeats)
      .then(() => {
        refreshReservations();
        refreshSeats();
        navigate('/reservations');
      })
      .catch((err) => {
        handleErrors(err);
        throw err;
      })

  }

  /** Handle edit Reservation through map*/
  const updateReservationFromMap = async (reservationId, newSeats) => {
    setDisabled(true);
    try {
      await API.updateReservationFromMap(reservationId, newSeats);
      refreshReservations();
      refreshSeats();
      navigate('/reservations');
    } catch (err) {
      handleErrors(err);
      throw err;
    }
    finally {
      setDisabled(false);
    }

  }


  return (
    <Routes>
      <Route path='/' element={<GenericLayout user={user} loggedIn={loggedIn} logout={handleLogout}
        message={message} setMessage={setMessage} initialLoading={initialLoading} />} >

        <Route index element={<HomeLayout seats={seats} />} />

        <Route path='/reservations' element={loggedIn ? <Reservations user={user}  disabled={disabled} reservations={reservations} seats={seats}
          deleteReservation={deleteReservation}
        /> : <Navigate replace to='/' />} />

        <Route path='/edit/:reservationId' element={loggedIn ? <EditLayout editReservation={editReservation} reservations={reservations}
          deleteReservation={deleteReservation} handleErrors={handleErrors} updateReservationFromMap={updateReservationFromMap}
          seats={seats} /> : <Navigate replace to='/' />} />


        <Route path='/add' element={loggedIn ? <EditLayout addReservation={addReservation}
          addReservationMap={addReservationMap} seats={seats} /> : <Navigate replace to='/' />} />
        <Route path='/*' element={<DefaultRoute />} />

      </Route>

      <Route path='/login' element={<Login loggedIn={loggedIn} login={handleLogin} setUser={setUser}
        setAuthCompleted={setAuthCompleted} refreshReservations={refreshReservations} refreshSeats={refreshSeats} authCompleted={authCompleted} />} />

    </Routes>

  );
}


function Login(props) {
  if (props.loggedIn) {
    if (props.authCompleted) {
      return <Navigate replace to='/' />;
    } else {
      return <TotpForm totpSuccessful={(updatedUser) => { props.setUser(updatedUser), props.setAuthCompleted(true), props.refreshReservations(), props.refreshSeats() }} />;
    }
  } else {
    return <LoginForm login={props.login} />;
  }
}



export default App
