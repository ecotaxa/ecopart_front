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
    Divider,
    FormHelperText,
} from "@mui/material";
import Grid from "@mui/material/Grid";

import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";

import { NewProjectFormValues } from "../types/newProject.types";

/**
 * Type representing a single row in our Privileges UI table.
 */
type PrivilegeRow = NewProjectFormValues["privileges"][0];

interface PrivilegesSectionProps {
    values: NewProjectFormValues["privileges"];
    onChange: (data: NewProjectFormValues["privileges"]) => void;
    availableUsers: Array<{
        user_id: number;
        first_name: string;
        last_name: string;
        email: string;
        deleted?: string | null;
    }>;
    currentUserId: number | null;
    managerError?: string;
    contactError?: string;
}

export const PrivilegesSection: React.FC<PrivilegesSectionProps> = ({
    values,
    onChange,
    availableUsers,
    //currentUserId, // We keep this prop even if not used in handleAddRow anymore, it might be useful later
    managerError,
    contactError,
}) => {
    // --- FILTER ACTIVE USERS ---
    const activeUsers = useMemo(() => {
        return availableUsers.filter((user) => {
            if (user.deleted) return false;

            if (
                user.first_name.toLowerCase().includes("anonym") ||
                user.last_name.toLowerCase().includes("anonym")
            ) {
                return false;
            }

            return true;
        });
    }, [availableUsers]);

    // --- LOCAL ARRAY HANDLERS ---

    const handleAddRow = () => {
        // When adding an extra row, we create a blank "Member" instead of defaulting to the current user.
        // This prevents duplicating the authenticated user who is already pre-filled on page load.
        const newRow: PrivilegeRow = {
            userId: "", // Start with a blank selection
            role: "Member", // Default secondary users to Member
            contact: false, // Do not override the main contact by default
        };

        // We append the new blank row to the existing rows without overriding the contacts
        onChange([...values, newRow]);
    };

    const handleRemoveRow = (indexToRemove: number) => {
        const newValues = values.filter((_, index) => index !== indexToRemove);
        onChange(newValues);
    };

    const handleUpdateRow = <K extends keyof PrivilegeRow>(
        indexToUpdate: number,
        field: K,
        newValue: PrivilegeRow[K]
    ) => {
        const newValues = values.map((row, index) => {
            if (index !== indexToUpdate) {
                if (field === "contact" && newValue === true) {
                    return { ...row, contact: false };
                }
                return row;
            }

            return { ...row, [field]: newValue };
        });

        onChange(newValues);
    };

    // Helper function to determine if a user is already selected in ANOTHER row.
    // This allows us to disable the user in the dropdown.
    const isUserAlreadySelected = (targetUserId: string, currentRowIndex: number) => {
        return values.some(
            (row, index) => index !== currentRowIndex && row.userId === targetUserId
        );
    };

    return (
        <Box sx={{ mb: 5 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
                Privileges
            </Typography>

            <Grid container spacing={2} sx={{ mb: 1, display: { xs: "none", sm: "flex" } }}>
                <Grid size={{ sm: 4 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        User
                    </Typography>
                </Grid>
                <Grid size={{ sm: 4 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Privilege
                    </Typography>
                </Grid>
                <Grid size={{ sm: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Contact
                    </Typography>
                </Grid>
                <Grid size={{ sm: 1 }}></Grid>
            </Grid>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={2}>
                {values.map((row, index) => (
                    <Grid container spacing={2} alignItems="center" key={index}>
                        {(() => {
                            const selectedExists = activeUsers.some(
                                (user) => user.user_id.toString() === row.userId
                            );
                            const safeSelectedUserId = selectedExists ? row.userId : "";

                            return (
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label={safeSelectedUserId === "" ? "Select user" : ""}
                                        slotProps={{ inputLabel: { shrink: false } }}
                                        value={safeSelectedUserId}
                                        onChange={(e) => handleUpdateRow(index, "userId", e.target.value)}
                                    >
                                        {activeUsers.map((user) => {
                                            const userIdStr = user.user_id.toString();
                                            // Check if this user is selected somewhere else to disable the option
                                            const isDisabled = isUserAlreadySelected(userIdStr, index);

                                            return (
                                                <MenuItem
                                                    key={user.user_id}
                                                    value={userIdStr}
                                                    disabled={isDisabled}
                                                >
                                                    {user.first_name} {user.last_name}
                                                    {isDisabled && " (Already added)"}
                                                </MenuItem>
                                            );
                                        })}
                                    </TextField>
                                </Grid>
                            );
                        })()}

                        <Grid size={{ xs: 12, sm: 4 }}>
                            <ToggleButtonGroup
                                color="primary"
                                value={row.role}
                                exclusive
                                onChange={(_, newRole: PrivilegeRow["role"] | null) => {
                                    if (newRole !== null) {
                                        handleUpdateRow(index, "role", newRole);
                                    }
                                }}
                                size="small"
                                sx={{ height: 40 }}
                            >
                                <ToggleButton
                                    value="Manager"
                                    sx={{ textTransform: "none", borderRadius: "20px 0 0 20px" }}
                                >
                                    Manager
                                </ToggleButton>
                                <ToggleButton
                                    value="Member"
                                    sx={{ textTransform: "none", borderRadius: "0 20px 20px 0" }}
                                >
                                    Member
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Grid>

                        <Grid size={{ xs: 10, sm: 3 }}>
                            <Radio
                                checked={row.contact}
                                onChange={(e) => handleUpdateRow(index, "contact", e.target.checked)}
                                color="primary"
                            />
                        </Grid>

                        <Grid size={{ xs: 2, sm: 1 }} sx={{ textAlign: "right" }}>
                            <IconButton onClick={() => handleRemoveRow(index)} color="default">
                                <CloseIcon />
                            </IconButton>
                        </Grid>
                    </Grid>
                ))}
            </Stack>

            {(managerError || contactError) && (
                <Box sx={{ mt: 2 }}>
                    {managerError && <FormHelperText error>{managerError}</FormHelperText>}
                    {contactError && <FormHelperText error>{contactError}</FormHelperText>}
                </Box>
            )}

            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
                <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddRow}
                    sx={{ textTransform: "none", borderRadius: 2 }}
                >
                    Add user
                </Button>
            </Box>
        </Box>
    );
};