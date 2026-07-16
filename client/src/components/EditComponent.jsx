import API from '../API';
import { useState} from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router';


function EditForm(props) {
  const navigate = useNavigate();
//category selected in the form
  const [category, setCategory] = useState('normal');
  //number of seat in the form
  const [numberOfSeats, setNumberOfSeats] = useState(1);
  //state for disable the form after submission
  const [formDisabled, setFormDisabled] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);


  const initial = props.initialSeats || [];
  const selected = props.selectedSeats || [];

  //check if the map has been modified by the user
  const hasMapChanged = initial.length !== selected.length ||
    !initial.every(i => selected.some(s => s.rowLabel === i.rowLabel && s.seatNumber === i.seatNumber));

  // in reservation, the map is modified by 
  const isMapActive = props.editReservation ? hasMapChanged : selected.length > 0;


  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormDisabled(true)
    setErrorMsg('');
    try {

      if (hasMapChanged) {
        //user touched the map and he/she is in reservation edit
        if (props.editReservation) {
          // in reservations, if selected seats are all the seats of reservation, delete the reservation
          if (props.selectedSeats.length === 0) {
            await props.deleteReservation(props.reservationId);
          } else {
            // update
            await props.updateReservationFromMap(props.reservationId, props.selectedSeats);
          }

        } else {
          //user touched the map and he/she is in reserve part
          await props.addReservationMap(props.selectedSeats);
        }

        //user selected number of seats by form
      } else if (numberOfSeats > 0) {

        if (props.editReservation) {
          await props.editReservation(props.reservationId, category, numberOfSeats);
        } else {
          await props.addReservation(category, numberOfSeats);
        }
      } else {
        if (numberOfSeats < 1) {
          setErrorMsg("Number of seats must be at least 1");
          return
        }
      }
    } catch (err) {
     //handled by App.jsx
    } finally {
      setFormDisabled(false);
    }

  };


  return (
    <>
      {errorMsg ? <Alert variant='danger' onClose={() => setErrorMsg('')} dismissible>{errorMsg}</Alert> : false}
     
      <Form onSubmit={handleSubmit}>
        {/* Number of seats */}
        <Form.Group className="mb-3" controlId="formNumberOfSeats">
          <Form.Label>Number of Seats</Form.Label>
          <Form.Control
            type="number"
            min="1"
            value={numberOfSeats}
            disabled={isMapActive}
            onChange={(e) => setNumberOfSeats(e.target.value)}
            required
          />
          <Form.Text className="text">
            Select how many seats add.
          </Form.Text>
        </Form.Group>

        {/* Category Selection */}
        <Form.Group className="mb-4">
          <Form.Label>Category</Form.Label>
          <Form.Select
            value={category}
            disabled={isMapActive}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="normal">Normal</option>
            <option value="premium">Premium</option>
          </Form.Select>
        </Form.Group>

        {/* Submit Button */}
        <div className="mb-4 justify-content-between ">
          <Button className="mb-3" variant="primary" type="submit" disabled={formDisabled || (!isMapActive && !numberOfSeats)} >
            {formDisabled ? 'Processing...' : 'Submit Request'}
          </Button>
        </div>

      </Form>

    </>

  )

}

export { EditForm };