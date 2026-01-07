import { Button, Container, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import MainLayout from "@/app/layouts/MainLayout";

export default function HomePage() {
    return (
        <MainLayout>
            <Container sx={{ mt: 8 }}>
                <Stack spacing={3} alignItems="center">
                    <Typography variant="h3" textAlign="center">
                        Ecopart
                    </Typography>

                    <Typography variant="h6" textAlign="center" color="text.secondary">
                        Explore, manage, and analyze ecological data efficiently.
                    </Typography>

                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="contained"
                            component={RouterLink}
                            to="/login"
                        >
                            Login
                        </Button>

                        <Button
                            variant="outlined"
                            component={RouterLink}
                            to="/explore"
                            disabled
                        >
                            Explore
                        </Button>
                    </Stack>
                </Stack>
            </Container>
        </MainLayout>
    );
}