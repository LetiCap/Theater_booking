import 'bootstrap-icons/font/bootstrap-icons.css';
import { Row, Col, Container, Button, Spinner, Alert, Nav, Navbar, Form } from 'react-bootstrap';
import { Outlet, Link, NavLink, useParams, Navigate, useNavigate } from 'react-router';
import { LoginButton, LogoutButton, } from './AuthComponents.jsx';
import { ReservationsList } from './ReservationListComponents.jsx';
import { EditForm } from './EditComponent.jsx';
import { SeatMap } from './MapComponent.jsx';


import { useEffect, useState } from 'react';

import API from '../API.js';




function DefaultRoute(props) {
    return (
        <Container fluid>
            <p className="my-2">No data here: This is not a valid page!</p>
            <Link to='/'>Please go back to main page</Link>
        </Container>
    );
}

function GenericLayout(props) {
    return (
        <>
            <Header user={props.user} loggedIn={props.loggedIn} logout={props.logout} />
            <Container fluid className="mt-3">
                {props.message ? (
                    <Row>
                        <Col>
                            <Alert
                                className='my-1'
                                onClose={() => props.setMessage('')}
                                variant='danger'
                                dismissible>
                                {props.message}
                            </Alert>
                        </Col>
                    </Row>
                ) : null}

                {props.initialLoading ? (
                    <div className="text-center mt-5">
                        <Spinner className="m-2" />
                        <h4 className="mt-3">Loading theater data...</h4>
                    </div>
                ) : (
                    <Outlet />
                )}
            </Container>
        </>
    )
}


function HomeLayout(props) {
    return (
        <Container className="mt-4 text-center">

            <Row className="mb-4">
                <Col>
                    <h1 className="display-5 fw-bold">Welcome to the Theater</h1>
                    <p className="lead text-muted">
                        Check the availability and book your favorite seats for the show.
                    </p>
                </Col>
            </Row>



            <Row className="justify-content-center">
                <Col >
                    
                    <div className="p-4 shadow-sm border rounded bg-light">
                        <SeatMap seats={props.seats} />
                    </div>
                </Col>
            </Row>

        </Container>
    );
}

function Header(props) {
    const name = props.user && props.user.name;

    return (
        <Navbar bg="dark" variant="dark" >
            <Container fluid>
                <Link to="/" className="navbar-brand mx-2">
                    <i className="bi bi-film me-2"></i>
                    Theater
                </Link>

                {/*  gap 3 is the distance, me-auto handle all the rest in the right part  */}
                <Nav className="me-auto ms-4 gap-3">
                    {/**appear only if logged in */}
                    {props.user && (
                        <NavLink to="/reservations" className="nav-link">
                            Reservations
                        </NavLink>
                    )}
                    {/**appear only if is not an admin */}
                    {props.user && !props.user.activeAdmin && (
                        <NavLink to="/add" className="nav-link">
                            Reserve
                        </NavLink>
                    )}
                </Nav>

                <Nav>
                    {name ? <div>
                        <Navbar.Text className='fs-5 me-3'>

                            {`Signed in ${props.user.activeAdmin ? '(Admin)' : ''} as: ${props.user.name}`}
                        </Navbar.Text>
                        <LogoutButton logout={props.logout} />
                    </div> :
                        <Link to='/login'>
                            <LoginButton />
                        </Link>}
                </Nav>
            </Container>
        </Navbar >
    );
}


const Reservations = (props) => {
    const [reservationId, setReservationId] = useState(null);
    return (
        <>
            <Row className="mt-3 mb-4 align-items-center">
                <Col xs={4}>
                   
                    <Link to="/">
                        <Button variant="outline-secondary">
                            <i className="bi bi-arrow-left me-2"></i>
                            Back to Map
                        </Button>
                    </Link>
                </Col>
                <Col xs={7} className="text-center">
                    {props.user && props.user.activeAdmin === false ? (
                        <h2 className="m-0 text-dark">
                            <i className="bi bi-ticket-detailed me-2"></i>
                            Your Reservations
                        </h2>
                    ) : (
                        <h2 className="m-0 text-primary">
                            <i className="bi bi-ticket-detailed me-2"></i>
                            All Reservations
                        </h2>
                    )}
                </Col>

            </Row>
            <Row className="mb-3">
                <Col xs={12}>
                    {props.reservations.length === 0 ? (
                        <Alert variant='info'>
                            No reservations found.
                            {/* Condition: only normal user, not Admin */}
                            {props.user && props.user.activeAdmin === false && (
                                <span className="ms-2">
                                    <Link to="/add" className="alert-link">
                                        Click here to generate a new reservation.
                                    </Link>
                                </span>
                            )}
                        </Alert>
                    ) : null}
                </Col>
            </Row>
            {props.reservations.length > 0 && (
                <Row>
                    <Col xs={4}>
                        <ReservationsList disabled={props.disabled} reservations={props.reservations}
                            deleteReservation={props.deleteReservation} reservationId={reservationId}
                            onClickReservation={(id) => setReservationId(id)} />
                    </Col>

                    <Col xs={8}>
                        <SeatMap seats={props.seats} reservationId={reservationId}
                            userReservations={props.reservations} />
                    </Col>
                </Row>
            )}
        </>
    );
}


function EditLayout(props) {
    const { reservationId } = useParams();
    const navigate = useNavigate();
    // seats that are selected by the user
    const [selectedSeats, setSelectedSeats] = useState([]);
    //seats at the intial loading of the user
    const [initialSeats, setInitialSeats] = useState([]);


    useEffect(() => {
        // If we are in "reservations", fetch the current seats for this reservation
        if (props.editReservation && reservationId) {
            API.fetchSeatsbyReservationId(reservationId)
                .then((seats) => {
                    setSelectedSeats(seats);
                    setInitialSeats(seats);
                })
                .catch((err) => {
                    props.handleErrors(err);
                    navigate('/reservations');
                })
        } else {
            // Reset states if we are in "Add" mode
            setSelectedSeats([]);
            setInitialSeats([]);

        }
    }, [reservationId, navigate]);


    // function that handle the selection on map
    const handleSeatToggle = (seat) => {
        setSelectedSeats((oldSelected) => {
            // check if the seat selected was already during this phase of edit
            const exists = oldSelected.find(s => s.rowLabel === seat.rowLabel && s.seatNumber === seat.seatNumber);

            if (exists) {
                // if already selected, it means that he/she selected a seat to add, and then user re-selected it again. so it doesn't count in the list of seats to add
                return oldSelected.filter(s => !(s.rowLabel === seat.rowLabel && s.seatNumber === seat.seatNumber));
            } else {
                // If not selected, add it to the array
                return [...oldSelected, seat];
            }
        });
    };

    return (
        <>
            <Row className="mt-3 mb-4 align-items-center">
                <Col xs={4}>
                    <Link to="/reservations">
                        <Button variant="outline-secondary">
                            <i className="bi bi-arrow-left me-2"></i>
                            Back to Map
                        </Button>
                    </Link>
                </Col>
                <Col xs={7}className="text-center">
                    <h2 className="m-0 text-dark">
                        {props.editReservation ? `Edit Reservation ${reservationId}` : 'New Reservation'}
                    </h2>
                </Col>
            </Row>
            <Row >
                <Col xs={4}>
                    <EditForm reservationId={reservationId}
                        addReservationMap={props.addReservationMap}
                        selectedSeats={selectedSeats}
                        initialSeats={initialSeats}
                        deleteReservation={props.deleteReservation}
                        updateReservationFromMap={props.updateReservationFromMap}
                        editReservation={props.editReservation}
                        addReservation={props.addReservation} />
                </Col>

                <Col xs={8}>
                    <SeatMap seats={props.seats} reservationId={Number(reservationId)}
                        userReservations={props.reservations} selectedSeats={selectedSeats}
                        addReservation={props.addReservation} editReservation={props.editReservation}
                        onSeatClick={handleSeatToggle} />
                </Col>
            </Row>
        </>

    )
}




export { DefaultRoute, GenericLayout, Header, Reservations, EditLayout, HomeLayout };
