import { Row, Col, Button, Badge } from 'react-bootstrap';
import { useState } from 'react';

//function to establish the relation between the seat and the user
const getSeatStatus = (seat, reservationId, userReservations) => {
    //isActive true if the seat belong to the reservation selected
    const isActive = reservationId && seat.reservationId === reservationId;
    //isMine true if a seat belong to one of the user's reservations
    const isMine = userReservations.includes(seat.reservationId);
    //isOccupiedByOthers is true if the seat has a reservation(is occupied), but doesn't belong to the user
    const isOccupiedByOthers = seat.reservationId && !isMine;

    return { isActive, isMine, isOccupiedByOthers };
};

//fucntion to establish if a seat can be selected or not
const calculateDisabledStatus = (seat, props, status) => {
    const { addReservation, editReservation } = props;
    const { isActive, isOccupiedByOthers } = status;

    if (seat.reservationId && addReservation) return true;
    if (editReservation && !isActive && seat.reservationId) return true;
    if (!addReservation && !editReservation) return true;
    return false;
};



function SeatMap(props) {

    const [formDisabled, setFormDisabled] = useState(false);
    const { seats = [], reservationId, userReservations = [] } = props;


    // from the single seats, we group togheter the seats of each row
    const rows = {};

    seats.forEach(seat => {
        if (!rows[seat.rowLabel]) rows[seat.rowLabel] = [];
        rows[seat.rowLabel].push(seat);
    });

    //rows = { "A":[1,2,3], "B":[1,2,3]}


    return (
        <div className="seat-map text-center">
            <div className="bg-dark text-white p-2 mb-4 rounded shadow-sm fw-bold">
                Stage
            </div>
            {/**each object(A:[1,2,3]) contains the seats belonging to a letter. 
             * we create an array containing all letter --> [A,B,C..]
             * we order the letter with .sort a
            */}
            {Object.keys(rows).sort().map(rowLabel => (
                //we create a row for each Letter //flex-nowrap needed to avoid button to start a new line 
                <Row key={rowLabel} className="justify-content-center mb-2 flex-nowrap">

                    {/** Letter at the beginning of the row*/}
                    <Col xs="auto" className="d-flex align-items-center me-2 fw-bold ">
                        {rowLabel}
                    </Col>
                    {/** for the letter that we consider, we order its seats. for each seat we create a button*/}
                    {rows[rowLabel].sort((a, b) => a.seatNumber - b.seatNumber).map(seat => {

                        const status = getSeatStatus(seat, reservationId, userReservations);
                        const isDisabled = calculateDisabledStatus(seat, props, status);

                        //check if the seat belongs to the selected seats on the map
                        const isSelected = props.selectedSeats && props.selectedSeats.some(s =>
                            s.rowLabel === seat.rowLabel && s.seatNumber === seat.seatNumber);

                        
                        /**COLOR DEFINITION */
                        //free seats colour
                        let variant = "outline-secondary";

                        if (status.isOccupiedByOthers) {
                            // Red: seats already occupied by other users
                            variant = "danger";

                        } else if (status.isActive) {
                            /*seat with colour blu. seats belonging to the reservation selected. 
                            if a user deselect its seat, it become outline-danger red, due to the de-selection
                            only if edit mode*/
                            if (props.editReservation) {
                                variant = isSelected ? "primary" : "outline-danger";
                            } else {
                                variant = "primary";
                            }
                        } else if (isSelected) {
                            variant = "success"; //seat selected to be added are green
                        } else if (status.isMine && !status.isActive) {
                            // Light Blue: seats belonging to the user's other reservations
                            variant = "info";
                        } else if (seat.category === 'premium' && !seat.reservationId) {
                            //premium but free
                            variant = "outline-warning";
                        }

                        return (
                            <Col xs="auto" key={`${seat.rowLabel}${seat.seatNumber}`} className="px-1">
                                <Button
                                    variant={variant}
                                    /**centering number in the seats and bold */
                                    className="p-0 fw-bold"
                                    style={{ width: '30px', height: '30px' }}
                                    disabled={isDisabled}
                                    onClick={() => props.onSeatClick && props.onSeatClick(seat)}
                                >
                                    {seat.seatNumber}
                                </Button>
                            </Col>
                        )
                    })}
                </Row>
            ))}
        </div>
    )
}
export { SeatMap };