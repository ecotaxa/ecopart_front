import React, { useMemo } from "react";
import {
    Box,
    Typography,
    TextField,
    MenuItem,
    IconButton,
    Button,
    Radio,
    ToggleButton,
    ToggleButtonGroup,
    Stack,
    Divider
} from "@mui/material";
import Grid from "@mui/material/Grid";

// Icons
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';

import { NewProjectFormValues } from "../types/newProject.types";

/**
 * Type representing a single row in our Privileges UI table.
 */
type PrivilegeRow = NewProjectFormValues['privileges'][0];

interface PrivilegesSectionProps {
    values: NewProjectFormValues['privileges'];
    // For arrays, we usually pass the whole updated array back to the parent
    onChange: (data: NewProjectFormValues['privileges']) => void;
    // The raw users list directly from the API
    availableUsers: Array<{ user_id: number; first_name: string; last_name: string; email: string; deleted?: string | null }>;
}

export const PrivilegesSection: React.FC<PrivilegesSectionProps> = ({ values, onChange, availableUsers }) => {

    // --- FILTER ACTIVE USERS ---
    // We use useMemo to avoid re-filtering the array on every single keystroke.
    // It will only re-calculate if 'availableUsers' from the API changes.
    const activeUsers = useMemo(() => {
        return availableUsers.filter(user => {
            // 1. Check if the 'deleted' property exists and is not null
            if (user.deleted) return false;
            
            // 2. Extra safety: Check if the name contains "anonym" (as seen in your DB)
            if (user.first_name.toLowerCase().includes("anonym") || user.last_name.toLowerCase().includes("anonym")) {
                return false;
            }
            
            return true; // Keep the user
        });
    }, [availableUsers]);

    // --- LOCAL ARRAY HANDLERS ---

    // Adds a new empty row to the privileges array
    const handleAddRow = () => {
        const newRow: PrivilegeRow = {
            userId: "",
            role: "Member", // Default role
            contact: false
        };
        // Create a new array with the new row appended
        onChange([...values, newRow]);
    };

    // Removes a row at a specific index
    const handleRemoveRow = (indexToRemove: number) => {
        // Filter out the row that matches the index
        const newValues = values.filter((_, index) => index !== indexToRemove);
        onChange(newValues);
    };

    // Updates a specific field of a specific row
    const handleUpdateRow = <K extends keyof PrivilegeRow>(indexToUpdate: number, field: K, newValue: PrivilegeRow[K]) => {
        const newValues = values.map((row, index) => {
            // If it's not the row we are updating, we check for the contact exclusivity
            if (index !== indexToUpdate) {
                // RULE: Only ONE user can be the contact.
                // If we are setting another row to be the contact, remove the contact flag from this one.
                if (field === 'contact' && newValue === true) {
                    return { ...row, contact: false };
                }
                return row; // Keep row unchanged
            }

            // If it IS the row we want to update, merge the new value
            return { ...row, [field]: newValue };
        });

        onChange(newValues);
    };

    return (
        <Box sx={{ mb: 5 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
                Privileges
            </Typography>

            {/* Table Header (Hidden on extra small screens for better responsiveness) */}
            <Grid container spacing={2} sx={{ mb: 1, display: { xs: 'none', sm: 'flex' } }}>
                <Grid size={{ sm: 4 }}><Typography variant="subtitle2" color="text.secondary">User</Typography></Grid>
                <Grid size={{ sm: 4 }}><Typography variant="subtitle2" color="text.secondary">Privilege</Typography></Grid>
                <Grid size={{ sm: 3 }}><Typography variant="subtitle2" color="text.secondary">Contact</Typography></Grid>
                <Grid size={{ sm: 1 }}></Grid> {/* Empty space for the delete button */}
            </Grid>
            <Divider sx={{ mb: 2 }} />

            {/* Dynamic Rows */}
            <Stack spacing={2}>
                {values.map((row, index) => (
                    <Grid container spacing={2} alignItems="center" key={index}>

                        {/* User Selection */}
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                select
                                fullWidth
                                size="small"
                                label={row.userId === "" ? "Select user" : ""}
                                slotProps={{ inputLabel: { shrink: false } }} // Hides label when value is selected to match mockup
                                value={row.userId}
                                onChange={(e) => handleUpdateRow(index, 'userId', e.target.value)}
                            >
                                {/* NEW: We map over 'activeUsers' instead of 'availableUsers' */}
                                {activeUsers.map((user) => (
                                    <MenuItem key={user.user_id} value={user.user_id.toString()}>
                                        {user.first_name} {user.last_name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {/* Privilege Toggle (Manager / Member) */}
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <ToggleButtonGroup
                                color="primary"
                                value={row.role}
                                exclusive
                                onChange={(_, newRole) => {
                                    if (newRole !== null) { // Prevent unselecting both
                                        handleUpdateRow(index, 'role', newRole);
                                    }
                                }}
                                size="small"
                                sx={{ height: 40 }}
                            >
                                <ToggleButton value="Manager" sx={{ textTransform: 'none', borderRadius: '20px 0 0 20px' }}>Manager</ToggleButton>
                                <ToggleButton value="Member" sx={{ textTransform: 'none', borderRadius: '0 20px 20px 0' }}>Member</ToggleButton>
                            </ToggleButtonGroup>
                        </Grid>

                        {/* Contact Radio Button */}
                        <Grid size={{ xs: 10, sm: 3 }}>
                            {/* We use a radio button to visually indicate exclusivity */}
                            <Radio
                                checked={row.contact}
                                onChange={(e) => handleUpdateRow(index, 'contact', e.target.checked)}
                                color="primary"
                            />
                        </Grid>

                        {/* Remove Row Button */}
                        <Grid size={{ xs: 2, sm: 1 }} sx={{ textAlign: 'right' }}>
                            <IconButton onClick={() => handleRemoveRow(index)} color="default">
                                <CloseIcon />
                            </IconButton>
                        </Grid>

                    </Grid>
                ))}
            </Stack>

            {/* Add User Button */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddRow}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                    Add user
                </Button>
            </Box>
        </Box>
    );
};