import { useState } from 'react';
import { Form, Button, Alert, Container, Col, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router';
import API from '../API.js';


function LoginForm(props) {
    const [username, setUsername] = useState('a@p.it');
    const [password, setPassword] = useState('exam');
    const [errorMessage, setErrorMessage] = useState('');
    const [loginAsAdmin, setLoginAsAdmin] = useState(false);
    const navigate = useNavigate();


    const handleSubmit = (event) => {
        event.preventDefault();
        //reset error message
        setErrorMessage('');

        if (!username.trim() || !password.trim()) {
            setErrorMessage('Username and password are required');
            return;
        }
        const credentials = { username, password, loginAsAdmin };
        props.login(credentials )
            .then(() => {})
            .catch((err) => {
                //handle the error here
                setErrorMessage(err.error || "Login failed");
            });
    }

    return (
        <Container>
            <Row>
                <Col xs={4}></Col>
                <Col xs={4}>
                    <h1 className="pb-3">Login</h1>

                    <Form onSubmit={handleSubmit}>
                        {errorMessage ? <Alert dismissible onClose={() => setErrorMessage('')} variant="danger">{errorMessage}</Alert> : null}
                        <Form.Group className="mb-3" controlId='username'>
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                value={username}
                                onChange={(ev) => setUsername(ev.target.value)}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId='password'>
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={password}
                                onChange={(ev) => setPassword(ev.target.value)}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId='use2fa'>
                            <Form.Check
                                type="checkbox"
                                label="Login as Admin"
                                checked={loginAsAdmin}
                                onChange={(ev) => setLoginAsAdmin(ev.target.checked)}
                            />
                        </Form.Group>
                        <Button className="my-3" type="submit">Login</Button>
                        <Button className='my-3 mx-3' variant='danger' onClick={() => navigate('/')}>Cancel</Button>
                    </Form>
                </Col>
                <Col xs={4}></Col>
            </Row>
        </Container>

    )
}


function TotpForm(props) {
    const [totpCode, setTotpCode] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();


    const doTotpVerify = () => {
        API.totpVerify(totpCode)
            //we get the user info updated after the totp phase
            .then((updatedUser) => {
                setErrorMessage('');
                //we pass the updated info to the parent
                props.totpSuccessful(updatedUser);
            })
            .catch((err) => {
                if (err && err.error && err.error === "Not authorized") {
                    setErrorMessage('Your session has expired, you will be redirected to the login page');
                    setTimeout(() => props.setLoggedIn(false), 2000);
                } else {
                    setErrorMessage('Wrong code, please try again');
                }
            })
    }

    const handleSubmit = (event) => {
        event.preventDefault();
        setErrorMessage('');
        // Some validation
        let valid = true;
        if (totpCode === '' || totpCode.length !== 6)
            valid = false;
        if (valid) {
            doTotpVerify(totpCode);
        } else {
            setErrorMessage('Invalid content in form: either empty or not 6-char long');
        }
    };

    return (
        <Container>
            <Row>
                <Col xs={4}></Col>
                <Col xs={4}>
                    <h2>Second Factor Authentication</h2>
                    <h5>Please enter the code that you read on your device</h5>
                    <Form onSubmit={handleSubmit}>
                        {errorMessage ? <Alert variant='danger' dismissible onClick={() => setErrorMessage('')}>{errorMessage}</Alert> : ''}
                        <Form.Group controlId='totpCode'>
                            <Form.Label>Code</Form.Label>
                            <Form.Control type='text' value={totpCode} onChange={ev => setTotpCode(ev.target.value)} />
                        </Form.Group>
                        <Button className='my-2' type='submit'>Validate</Button>
                        <Button className='my-2 mx-2' variant='danger' onClick={() => navigate('/')}>Cancel</Button>
                    </Form>
                </Col>
                <Col xs={4}></Col>
            </Row>
        </Container>
    )

}



function LogoutButton(props) {
    return (
        <Button variant="outline-light" onClick={props.logout}>Logout</Button>
    )
}

function LoginButton(props) {
    const navigate = useNavigate();
    return (
        <Button variant="outline-light" onClick={() => navigate('/login')}>Login</Button>
    )
}

export { LoginForm, LogoutButton, LoginButton, TotpForm };
