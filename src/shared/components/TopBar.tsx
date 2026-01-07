import { useState, MouseEvent } from "react";
import {
    AppBar,
    Box,
    Toolbar,
    Typography,
    Stack,
    Menu,
    MenuItem,
    Divider,
    IconButton,
    Button
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import CloudIcon from "@mui/icons-material/Cloud";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

import { Link as RouterLink, useNavigate } from "react-router-dom";

import { useAuthStore } from "@/features/auth";

export default function TopBar() {
    const navigate = useNavigate();
    const { isAuthenticated, user, clearUser } = useAuthStore();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleOpen = (event: MouseEvent<HTMLElement>) =>
        setAnchorEl(event.currentTarget);

    const handleClose = () => setAnchorEl(null);

    const handleLogout = async () => {
        try {
            await fetch("/auth/logout", {
                method: "POST",
                credentials: "include",
            });
        } finally {
            clearUser();
            navigate("/");
        }
    };


    return (
        <AppBar position="static" color="transparent" elevation={0}>
            <Toolbar sx={{ justifyContent: "space-between" }}>
                {/* Logo */}
                <Box
                    component={RouterLink}
                    to="/"
                    sx={{
                        display: "flex",
                        alignItems: "stretch",
                        height: "100%",
                        textDecoration: "none",
                    }}
                >
                    <Box
                        component="img"
                        src="/logo_ecopart.png"
                        alt="EcoPart"
                        sx={{
                            height: "100%",
                            maxHeight: "64px", // default MUI AppBar height
                            objectFit: "contain",
                        }}
                    />
                </Box>


                {/* Navigation */}
                <Stack direction="row" spacing={3}>
                    <NavLink to="/about" label="About" />
                    <NavLink to="/explore" label="Explore" />
                    <NavLink to="/ecotaxa" label="EcoTaxa" />
                    {isAuthenticated && (
                        <>
                            <NavLink to="/projects" label="Projects" />
                            <NavLink to="/tasks" label="Tasks" />

                            {user?.is_admin && (
                                <NavLink to="/admin" label="Admin" />
                            )}
                        </>
                    )}

                </Stack>

                {/* User */}
                {isAuthenticated && user ? (
                    <>
                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            onClick={handleOpen}
                            sx={{ cursor: "pointer" }}
                        >
                            <Typography>
                                {user.first_name} {user.last_name}
                            </Typography>

                            <IconButton size="large">
                                <AccountCircleIcon fontSize="large" />
                            </IconButton>
                        </Stack>

                        <Menu
                            anchorEl={anchorEl}
                            open={open}
                            onClose={handleClose}
                            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                            transformOrigin={{ vertical: "top", horizontal: "right" }}
                        >
                            <Box sx={{ px: 2, py: 1 }}>
                                <Typography fontWeight={600}>
                                    {user.first_name} {user.last_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {user.email}
                                </Typography>
                            </Box>

                            <Divider />

                            <MenuItem onClick={() => navigate("/settings")}>
                                <SettingsIcon fontSize="small" sx={{ mr: 1 }} />
                                Settings
                            </MenuItem>

                            <MenuItem onClick={() => navigate("/ecotaxa-account")}>
                                <CloudIcon fontSize="small" sx={{ mr: 1 }} />
                                EcoTaxa account
                            </MenuItem>

                            <Divider />

                            <MenuItem onClick={handleLogout}>
                                <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                                Log out
                            </MenuItem>
                        </Menu>
                    </>
                ) : (
                    <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => navigate("/login")}
                    >
                        Log in
                    </Button>
                )}

            </Toolbar>
        </AppBar>
    );
}

function NavLink({ to, label }: { to: string; label: string }) {
    return (
        <Typography
            component={RouterLink}
            to={to}
            sx={{
                textDecoration: "none",
                color: "primary.main",
                fontWeight: 500,
            }}
        >
            {label}
        </Typography>
    );
}
