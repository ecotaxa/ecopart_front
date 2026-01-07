import { Button, Container, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";


import MainLayout from "@/app/layouts/MainLayout";

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <MainLayout>
            <Container sx={{ mt: 8, textAlign: "center" }}>
                <Typography variant="h3" gutterBottom>
                    404
                </Typography>

                <Typography variant="h6" gutterBottom>
                    Page not found
                </Typography>

                <Typography sx={{ mb: 4 }}>
                    The page you are looking for does not exist or has been moved.
                </Typography>

                <Button variant="contained" onClick={() => navigate("/")}>
                    Go to dashboard
                </Button>
            </Container>
        </MainLayout>
    );
}
