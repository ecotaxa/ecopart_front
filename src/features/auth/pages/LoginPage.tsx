import {
    Button,
    Container,
    TextField,
    Typography,
    Box,
    Checkbox,
    FormControlLabel,
    Link,
    Alert,
    CircularProgress,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import { useState } from "react";
import { useNavigate, Navigate, useLocation } from "react-router-dom";

import { loginRequest, fetchMe } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";

import MainLayout from "@/app/layouts/MainLayout";

export default function LoginPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const setUser = useAuthStore((s) => s.setUser);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);

    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const successMessage = location.state?.successMessage;

    // Already logged in → redirect
    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleSubmit = async () => {
        if (loading) return;

        setLoading(true);
        setError(null);

        try {
            await loginRequest(email, password);
            const user = await fetchMe();
            setUser(user);
            navigate("/dashboard");
        } catch {
            setError("Invalid email or password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout>
            <Container maxWidth="sm">
                <Box
                    sx={{
                        mt: 12,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                    }}
                >
                    {/* Logo */}
                    <Box
                        component="img"
                        src="/logo_ecopart.png"
                        alt="EcoPart"
                        sx={{
                            height: 48,
                            mb: 2,
                        }}
                    />

                    <Typography variant="h6" sx={{ mb: 4 }}>
                        Login into EcoPart
                    </Typography>

                    {successMessage && (
                        <Alert severity="success" sx={{ width: "100%", mb: 2 }}>
                            {successMessage}
                        </Alert>
                    )}

                    {error && (
                        <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <TextField
                        fullWidth
                        label="Email address"
                        placeholder="your@email.com"
                        margin="normal"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                    />

                    <TextField
                        fullWidth
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        margin="normal"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSubmit();
                        }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowPassword((v) => !v)}
                                        edge="end"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />


                    <FormControlLabel
                        sx={{ alignSelf: "flex-start", mt: 1 }}
                        control={
                            <Checkbox
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                        }
                        label="Remember me" // Remember me will be handled server-side (cookie duration) LATER

                    />

                    <Button
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, height: 48 }}
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : (
                            "LOG IN"
                        )}
                    </Button>

                    <Box
                        sx={{
                            mt: 2,
                            width: "100%",
                            display: "flex",
                            justifyContent: "space-between",
                        }}
                    >
                        <Link
                            component="button"
                            variant="body2"
                            onClick={() => navigate("/reset-password")}
                        >
                            Forgot password
                        </Link>

                        <Link
                            component="button"
                            variant="body2"
                            onClick={() => navigate("/register")}
                        >
                            New on EcoPart? Create an account!
                        </Link>
                    </Box>
                </Box>
            </Container>
        </MainLayout>
    );
}
