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
    CircularProgress // FIX: Added for loading state
} from "@mui/material";

// Importing shared components based on your architecture image
import { PasswordInput } from "@/shared/components/PasswordInput";
// Validation utility
import { isNonEmpty } from "@/shared/utils/validation";
// API calls
import { linkEcoTaxaAccount } from "../api/profile.api";
import { http } from "@/shared/api/http"; // FIX: Import http client to fetch instances

/* ---------------- TYPES ---------------- */

// FIX: Define the shape of the data returned by GET /ecotaxa_instances
interface EcoTaxaInstance {
    ecotaxa_instance_id: number;
    ecotaxa_instance_name: string;
    ecotaxa_instance_description: string;
    ecotaxa_instance_url: string;
}

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
    const [etInstance, setEtInstance] = useState<number | "">(""); // FIX: Initialize as empty until fetched
    const [etEmail, setEtEmail] = useState("");
    const [etPassword, setEtPassword] = useState("");
    const [etConsent, setEtConsent] = useState(false);
    
    // --- API STATES ---
    const [etLinking, setEtLinking] = useState(false); // Loading state for submit
    const [etMessage, setEtMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    
    // FIX: New states to hold the dynamically fetched instances
    const [instances, setInstances] = useState<EcoTaxaInstance[]>([]);
    const [loadingInstances, setLoadingInstances] = useState(true);

    // --- FETCH INSTANCES ON MOUNT ---
    useEffect(() => {
        const fetchInstances = async () => {
            setLoadingInstances(true);
            try {
                // Call your backend endpoint
                const dbInstances = await http<EcoTaxaInstance[]>("/ecotaxa_instances");
                setInstances(dbInstances);
                
                // Automatically select the first instance if available
                if (dbInstances.length > 0) {
                    setEtInstance(dbInstances[0].ecotaxa_instance_id);
                }
            } catch (err) {
                console.error("Failed to load EcoTaxa instances", err);
                setEtMessage({ type: 'error', text: "Failed to load EcoTaxa instances from server." });
                // We do NOT use fallback data here. If the DB fails, the user shouldn't be able to proceed.
            } finally {
                setLoadingInstances(false);
            }
        };

        fetchInstances();
    }, []); // Empty dependency array means this runs ONCE when the component mounts

    // --- HANDLERS ---

    /**
     * Handles the form submission.
     * Calls the API and notifies the parent upon success.
     */
    const handleLinkEcoTaxa = async () => {
        if (etInstance === "") return; // Safety check

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
    // Ensure all fields are filled, including the dynamically loaded instance
    const canLinkEcoTaxa = isNonEmpty(etEmail) && isNonEmpty(etPassword) && etConsent && etInstance !== "";

    // Helper to find selected instance details (for the register link and labels)
    const selectedEtInstance = instances.find(i => i.ecotaxa_instance_id === etInstance);

    // Render a global loading state if instances are still fetching
    if (loadingInstances) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

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

            {/* FIX: Instance Selection (Now dynamically populated) */}
            <TextField
                select
                fullWidth
                label="Instance"
                value={etInstance}
                onChange={(e) => setEtInstance(Number(e.target.value))}
                size="small"
                disabled={instances.length === 0} // Disable if API returned empty array
            >
                {instances.map((option) => (
                    <MenuItem key={option.ecotaxa_instance_id} value={option.ecotaxa_instance_id}>
                        {/* You asked to display 'ecotaxa_instance_name' */}
                        {option.ecotaxa_instance_name} 
                        {/* Optional: Add the description if you want it to be more informative, like in the other component */}
                        {/* {option.ecotaxa_instance_name} ({option.ecotaxa_instance_description}) */}
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
                disabled={!canLinkEcoTaxa || etLinking}
            >
                {etLinking ? "Connecting..." : "LOG IN"}
            </Button>

            {/* FIX: Helper Link now uses dynamic DB url */}
            {selectedEtInstance && (
                <Link
                    href={selectedEtInstance.ecotaxa_instance_url}
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