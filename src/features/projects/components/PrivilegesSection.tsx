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
    currentUserId,
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
        // The new row is automatically prefilled with the currently authenticated user,
        // manager role, and contact selected.
        const newRow: PrivilegeRow = {
            userId: currentUserId ? currentUserId.toString() : "",
            role: "Manager",
            contact: true,
        };

        // Only one user can be contact, so we clear the previous ones.
        const normalizedRows = values.map((row) => ({
            ...row,
            contact: false,
        }));

        onChange([...normalizedRows, newRow]);
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
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                select
                                fullWidth
                                size="small"
                                label={row.userId === "" ? "Select user" : ""}
                                slotProps={{ inputLabel: { shrink: false } }}
                                value={row.userId}
                                onChange={(e) => handleUpdateRow(index, "userId", e.target.value)}
                            >
                                {activeUsers.map((user) => (
                                    <MenuItem key={user.user_id} value={user.user_id.toString()}>
                                        {user.first_name} {user.last_name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

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