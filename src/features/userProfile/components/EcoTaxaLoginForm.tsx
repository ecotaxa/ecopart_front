import { useState } from "react";
import {
    Box,
    Button,
    TextField,
    Typography,
    MenuItem,
    Checkbox,
    FormControlLabel,
    Link,
    Alert,
    Stack
} from "@mui/material";

// Importing shared components based on your architecture image
import { PasswordInput } from "@/shared/components/PasswordInput";
// Validation utility
import { isNonEmpty } from "@/shared/utils/validation";
// API call specifically for the profile feature
import { linkEcoTaxaAccount } from "../api/profile.api";

/* ---------------- CONSTANTS ---------------- */
// Moved here because only this form uses these specific instances
const ECOTAXA_INSTANCES = [
    {
        value: 1,
        label: "EU (ecotaxa.obs-vlfr.fr)",
        name: "FR",
        url: "https://ecotaxa.obs-vlfr.fr/register"
    },
    {
        value: 2,
        label: "USA (ecotaxa.org)",
        name: "USA",
        url: "https://ecotaxa.org/register"
    },
];

/* ---------------- TYPES ---------------- */
// We define what the parent MUST provide to this component
interface EcoTaxaLoginFormProps {
    userId: number;             // Needed to perform the API request
    onSuccess: () => void;      // Callback to trigger when login succeeds (to refresh parent list)
    onCancel: () => void;       // Callback to trigger when user clicks cancel
    showCancelButton: boolean;  // Conditional rendering for the cancel button
}

/**
 * EcoTaxaLoginForm Component
 * Handles the interaction and state for linking a new EcoTaxa account.
 */
export const EcoTaxaLoginForm = ({
    userId,
    onSuccess,
    onCancel,
    showCancelButton
}: EcoTaxaLoginFormProps) => {

    // --- LOCAL STATE ---
    // These states are confined to this component. 
    // When this component unmounts, these states are destroyed automatically.
    const [etInstance, setEtInstance] = useState<number>(ECOTAXA_INSTANCES[0].value);
    const [etEmail, setEtEmail] = useState("");
    const [etPassword, setEtPassword] = useState("");
    const [etConsent, setEtConsent] = useState(false);
    const [etLinking, setEtLinking] = useState(false); // Loading state
    const [etMessage, setEtMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // --- HANDLERS ---

    /**
     * Handles the form submission.
     * Calls the API and notifies the parent upon success.
     */
    const handleLinkEcoTaxa = async () => {
        // Reset message and start loading
        setEtMessage(null);
        setEtLinking(true);

        try {
            // Call the API service
            await linkEcoTaxaAccount(userId, etInstance, etEmail, etPassword);

            // UI Feedback
            setEtMessage({ type: 'success', text: "EcoTaxa account linked successfully!" });

            // Notify the parent component to refresh the data
            onSuccess();

        } catch (err) {
            console.error(err);
            const msg = err instanceof Error ? err.message : "Failed to link EcoTaxa account.";
            setEtMessage({ type: 'error', text: msg });
        } finally {
            // Stop loading
            setEtLinking(false);
        }
    };

    // --- VALIDATION ---
    const canLinkEcoTaxa = isNonEmpty(etEmail) && isNonEmpty(etPassword) && etConsent;

    // Helper to find selected instance details (for the register link)
    const selectedEtInstance = ECOTAXA_INSTANCES.find(i => i.value === etInstance);

    return (
        <Stack spacing={3} sx={{ maxWidth: 400, mx: 'auto', textAlign: 'center', alignItems: 'center' }}>

            {/* Header Section with Image Logo */}
            <Box
                component="img"
                src="/logo_ecopart.png"
                alt="EcoPart"
                sx={{ height: 48, mb: 2 }}
            />

            <Typography variant="h6" sx={{ mt: 1 }}>
                Login into EcoTaxa
            </Typography>

            {/* Feedback Message (Success/Error) */}
            {etMessage && (
                <Alert severity={etMessage.type} sx={{ textAlign: 'left', width: '100%' }}>
                    {etMessage.text}
                </Alert>
            )}

            {/* Instance Selection */}
            <TextField
                select
                fullWidth
                label="Instance"
                value={etInstance}
                onChange={(e) => setEtInstance(Number(e.target.value))}
                size="small"
            >
                {ECOTAXA_INSTANCES.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>
                ))}
            </TextField>

            {/* Email Input */}
            <TextField
                fullWidth
                label="Email address"
                placeholder="john@gmail.com"
                value={etEmail}
                onChange={(e) => setEtEmail(e.target.value)}
                size="small"
            />

            {/* Password Input (Using Shared Component) */}
            <PasswordInput
                fullWidth
                label="Password"
                value={etPassword}
                onChange={(e) => setEtPassword(e.target.value)}
                size="small"
            />

            {/* Consent Checkbox */}
            <FormControlLabel
                control={
                    <Checkbox
                        checked={etConsent}
                        onChange={(e) => setEtConsent(e.target.checked)}
                        color="primary"
                    />
                }
                label={
                    <Typography variant="body2" sx={{ textAlign: 'left' }}>
                        I consent to giving EcoPart all access to my EcoTaxa account to allow it to manage my data on Ecotaxa
                    </Typography>
                }
                sx={{ alignItems: 'flex-start', mt: 1, width: '100%' }}
            />

            {/* Submit Button */}
            <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleLinkEcoTaxa}
                disabled={!canLinkEcoTaxa || etLinking}
            >
                {etLinking ? "Connecting..." : "LOG IN"}
            </Button>

            {/* Helper Link */}
            <Link
                href={selectedEtInstance?.url}
                target="_blank"
                rel="noopener noreferrer"
                variant="body2"
                underline="hover"
            >
                New on EcoTaxa {selectedEtInstance?.name}? Create an account!
            </Link>

            {/* Cancel Button (Conditional) */}
            {showCancelButton && (
                <Button
                    size="small"
                    onClick={onCancel} // Calls the parent's function to switch view
                    sx={{ mt: 1 }}
                >
                    Cancel and go back to list
                </Button>
            )}
        </Stack>
    );
};