import React from "react";
import { Box, Typography, TextField } from "@mui/material";
import Grid from "@mui/material/Grid";
import InputAdornment from '@mui/material/InputAdornment';
import { NewProjectFormValues } from "../types/newProject.types";

interface DataServerSectionProps {
    values: NewProjectFormValues['dataServer'];
    onChange: (data: Partial<NewProjectFormValues['dataServer']>) => void;
    // Boolean to trigger the disabled state/yellow box
    isRemoteProject: boolean;
}

export const DataServerSection: React.FC<DataServerSectionProps> = ({ values, onChange, isRemoteProject }) => {

    // If it's NOT a remote project, we hide the section entirely or show it disabled.
    // Based on mockup, it seems to appear with a yellow box block next to it.
    if (!isRemoteProject) {
        return null; // Or you can render a disabled version. Here we hide it if not remote.
    }

    return (
        <Grid container spacing={3} sx={{ mb: 5 }}>
            {/* LEFT SIDE: The Yellow Warning Box (Mockup exact match) */}
            <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{
                    backgroundColor: '#fff3cd', // Pale yellow
                    p: 3,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 1
                }}>
                    <Typography variant="body2" fontWeight="bold">
                        SECTION AVAILABLE ONLY IF REMOTE PROJECT
                    </Typography>
                </Box>
            </Grid>

            {/* RIGHT SIDE: The Form */}
            <Grid size={{ xs: 12, md: 8 }}>
                <Typography variant="h6" fontWeight="bold">Connexion to data server</Typography>
                <Typography variant="body2" color="warning.main" gutterBottom sx={{ mb: 3 }}>
                    Please, don't forget to fill this section, now or later.
                </Typography>

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth label="Host" size="small"
                            value={values.host} onChange={(e) => onChange({ host: e.target.value })}
                            InputProps={{ startAdornment: <InputAdornment position="start">/</InputAdornment> }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth label="User name" size="small"
                            value={values.username} onChange={(e) => onChange({ username: e.target.value })}
                            InputProps={{ startAdornment: <InputAdornment position="start">/</InputAdornment> }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth label="Directory on server" size="small"
                            value={values.directory} onChange={(e) => onChange({ directory: e.target.value })}
                            InputProps={{ startAdornment: <InputAdornment position="start">/</InputAdornment> }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        {/* Assuming you have a password field. Standard text used here to allow startAdornment easily */}
                        <TextField
                            fullWidth label="Password" type="password" size="small"
                            value={values.password} onChange={(e) => onChange({ password: e.target.value })}
                            InputProps={{ startAdornment: <InputAdornment position="start">/</InputAdornment> }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            fullWidth label="Additional reference of the vector" size="small"
                            value={values.vectorReference} onChange={(e) => onChange({ vectorReference: e.target.value })}
                            InputProps={{ startAdornment: <InputAdornment position="start">/</InputAdornment> }}
                        />
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};