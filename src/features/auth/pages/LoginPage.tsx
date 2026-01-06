import { Button, Container, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { loginRequest } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";

export default function LoginPage() {
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async () => {
        const { token } = await loginRequest(email, password);
        login(token);
        navigate("/");
    };

    return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
            <Typography variant="h5" gutterBottom>
                Login
            </Typography>

            <TextField
                fullWidth
                label="Email"
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />

            <TextField
                fullWidth
                label="Password"
                type="password"
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={handleSubmit}>
                Login
            </Button>
        </Container>
    );
}
