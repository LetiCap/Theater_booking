import { ListGroup, Button } from 'react-bootstrap';
import {  useNavigate } from 'react-router';


const ReservationsList = (props) => {
  const navigate = useNavigate();
  

  return (
    <ListGroup as="ul" className="my-2" >

      {
        (props.reservations).map(e => {
          const isSelected = props.reservationId === e;

          return (
            
            <ListGroup.Item
              as="li"
              key={e}
              className="d-flex justify-content-between align-items-center"
            >

              <Button
                variant="link"
                onClick={() => props.onClickReservation(isSelected ? null : e)}
                className={`fw-bold flex-grow-1 text-start text-decoration-none ${isSelected ? 'text-primary' : 'text-dark'}`}
              >
                <i className={`bi ${isSelected ? 'bi-eye-fill' : 'bi-eye'} me-2`}></i>
                Reservation #{e}
              </Button>

              <div>
                <Button
                  variant='danger'
                  disabled={props.disabled}
                  onClick={(event) => {
                    props.deleteReservation(e); //Pass the reservationId
                  }} >
                  <i className='bi bi-trash'></i>
                  Delete Reservation
                </Button>

                <Button className="ms-2"
                  variant='warning'
                  disabled={props.disabled}
                  onClick={() => { navigate(`/edit/${e}`) }} > 
                  <i className='bi bi-pencil-square'></i>
                  Edit
                </Button>
              </div>
            </ListGroup.Item>
          );
        })
      }
    </ListGroup>
  );
}

export { ReservationsList };