import { Box, Button, Container, Typography } from "@mui/material";
import ConstructionIcon from "@mui/icons-material/Construction";
import { useNavigate } from "react-router-dom";


interface ComingSoonPageProps {
    /** Name of the feature, shown as the page title (e.g. "Explore"). */
    title: string;
    /** One line on what the feature will offer. */
    description?: string;
}

/**
 * Placeholder for a navigation entry whose feature is not built yet, so a link
 * from the header or a page never lands on the 404 page.
 */
export default function ComingSoonPage({ title, description }: ComingSoonPageProps) {
    const navigate = useNavigate();

    return (
        <Container maxWidth="sm" sx={{ mt: 10, mb: 8, textAlign: "center" }}>
            <Box sx={{ color: "primary.main", mb: 2 }}>
                <ConstructionIcon sx={{ fontSize: 56 }} />
            </Box>
            <Typography variant="h4" gutterBottom>
                {title}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                {description ?? "This section is coming soon."}
            </Typography>
            <Button variant="contained" onClick={() => navigate("/")}>
                Back to home
            </Button>
        </Container>
    );
}
