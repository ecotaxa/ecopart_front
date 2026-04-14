import { useState, useEffect } from "react"; // FIX: Added useEffect
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
    Stack,
    CircularProgress
} from "@mui/material";

// Importing shared components based on your architecture image
import { PasswordInput } from "@/shared/components/PasswordInput";
// Validation utility
import { isNonEmpty } from "@/shared/utils/validation";
// API calls - using centralized functions from profile.api
import { linkEcoTaxaAccount, getEcoTaxaInstances, EcoTaxaInstance } from "../api/profile.api";

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
 * Now fetches instances dynamically from the API instead of using hardcoded values.
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

    // State for EcoTaxa instances fetched from API
    const [instances, setInstances] = useState<EcoTaxaInstance[]>([]);
    const [loadingInstances, setLoadingInstances] = useState(true);

    // Form state - instance ID will be set after instances are loaded
    const [etInstance, setEtInstance] = useState<number | "">("");
    const [etEmail, setEtEmail] = useState("");
    const [etPassword, setEtPassword] = useState("");
    const [etConsent, setEtConsent] = useState(false);
    const [etLinking, setEtLinking] = useState(false); // Loading state for form submission
    const [etMessage, setEtMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // --- FETCH INSTANCES ON MOUNT ---
    useEffect(() => {
        const fetchInstances = async () => {
            setLoadingInstances(true);
            try {
                // Fetch instances from the centralized API function
                const fetchedInstances = await getEcoTaxaInstances();
                setInstances(fetchedInstances);

                // Auto-select the first instance if available
                if (fetchedInstances.length > 0) {
                    setEtInstance(fetchedInstances[0].ecotaxa_instance_id);
                }
            } catch (error) {
                console.error("Failed to fetch EcoTaxa instances", error);
                setEtMessage({ type: 'error', text: "Failed to load EcoTaxa instances. Please try again later." });
            } finally {
                setLoadingInstances(false);
            }
        };

        fetchInstances();
    }, []);

    // --- HANDLERS ---

    /**
     * Handles the form submission.
     * Calls the API and notifies the parent upon success.
     */
    const handleLinkEcoTaxa = async () => {
        // Ensure instance is selected before submitting
        if (etInstance === "") {
            setEtMessage({ type: 'error', text: "Please select an EcoTaxa instance." });
            return;
        }

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
            // Provide more explicit error messages based on common failure scenarios
            let msg = "Failed to link EcoTaxa account.";
            if (err instanceof Error) {
                const errorText = err.message.toLowerCase();
                // Handle specific error cases with user-friendly messages
                if (errorText.includes("self-signed") || errorText.includes("certificate") || errorText.includes("ssl") || errorText.includes("depth_zero")) {
                    msg = "SSL certificate error: The EcoTaxa server is using a self-signed certificate. Please contact your administrator to configure the backend properly.";
                } else if (errorText.includes("invalid url") || errorText.includes("err_invalid_url")) {
                    msg = "Invalid EcoTaxa instance URL configured. Please contact your administrator to fix the instance configuration.";
                } else if (errorText.includes("500") || errorText.includes("internal server error")) {
                    msg = "Unable to connect to EcoTaxa. Please verify your credentials (email/password) are correct for the selected instance.";
                } else if (errorText.includes("401") || errorText.includes("unauthorized")) {
                    msg = "Invalid credentials. Please check your email and password.";
                } else if (errorText.includes("404")) {
                    msg = "EcoTaxa instance not found. Please try again or contact support.";
                } else if (errorText.includes("network") || errorText.includes("fetch")) {
                    msg = "Network error. Please check your internet connection and try again.";
                } else if (errorText.includes("timeout")) {
                    msg = "Connection timed out. The EcoTaxa server may be temporarily unavailable.";
                } else if (errorText.includes("session expired")) {
                    msg = "Your session has expired. Please refresh the page and try again.";
                } else {
                    // Use the original error message if it's already meaningful
                    msg = err.message;
                }
            }
            setEtMessage({ type: 'error', text: msg });
        } finally {
            // Stop loading
            setEtLinking(false);
        }
    };

    // --- VALIDATION ---
    // Include instance check in validation - must have a valid instance selected
    const canLinkEcoTaxa = etInstance !== "" && isNonEmpty(etEmail) && isNonEmpty(etPassword) && etConsent;

    // Helper to find selected instance details (for the register link)
    // Now uses the dynamically fetched instances instead of hardcoded values
    const selectedEtInstance = instances.find(i => i.ecotaxa_instance_id === etInstance);

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
                Log in to EcoTaxa
            </Typography>

            {/* Feedback Message (Success/Error) */}
            {etMessage && (
                <Alert severity={etMessage.type} sx={{ textAlign: 'left', width: '100%' }}>
                    {etMessage.text}
                </Alert>
            )}

            {/* Instance Selection - Now dynamically populated from API */}
            <TextField
                select
                fullWidth
                label="Instance"
                value={etInstance}
                onChange={(e) => setEtInstance(Number(e.target.value))}
                size="small"
                disabled={loadingInstances}
                InputProps={{
                    endAdornment: loadingInstances ? <CircularProgress size={20} /> : null,
                }}
            >
                {instances.map((instance) => (
                    <MenuItem key={instance.ecotaxa_instance_id} value={instance.ecotaxa_instance_id}>
                        {/* Display format: "NAME (URL)" for clarity */}
                        {instance.ecotaxa_instance_name} ({instance.ecotaxa_instance_url.replace(/^https?:\/\//, '').replace(/\/$/, '')})
                    </MenuItem>
                ))}
                {/* Show message when no instances are available */}
                {!loadingInstances && instances.length === 0 && (
                    <MenuItem value="" disabled>
                        No instances available
                    </MenuItem>
                )}
            </TextField>

            {/* Email Input */}
            <TextField
                fullWidth
                label="Email address"
                placeholder="john@gmail.com"
                value={etEmail}
                onChange={(e) => setEtEmail(e.target.value)}
                size="small"
                disabled={loadingInstances}
            />

            {/* Password Input (Using Shared Component) */}
            <PasswordInput
                fullWidth
                label="Password"
                value={etPassword}
                onChange={(e) => setEtPassword(e.target.value)}
                size="small"
                disabled={loadingInstances}
            />

            {/* Consent Checkbox */}
            <FormControlLabel
                control={
                    <Checkbox
                        checked={etConsent}
                        onChange={(e) => setEtConsent(e.target.checked)}
                        color="primary"
                        disabled={loadingInstances}
                    />
                }
                label={
                    <Typography variant="body2" sx={{ textAlign: 'left' }}>
                        I consent to granting EcoPart full access to my EcoTaxa account so it can manage my data on EcoTaxa.
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
                disabled={!canLinkEcoTaxa || etLinking || loadingInstances}
            >
                {etLinking ? "Connecting..." : "LOG IN"}
            </Button>

            {/* Helper Link - Uses the dynamically fetched instance URL for registration */}
            {selectedEtInstance && (
                <Link
                    href={`${selectedEtInstance.ecotaxa_instance_url}${selectedEtInstance.ecotaxa_instance_url.endsWith('/') ? '' : '/'}register`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                    underline="hover"
                >
                    New on EcoTaxa {selectedEtInstance.ecotaxa_instance_name}? Create an account!
                </Link>
            )}

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