import React from "react";
import { Box, Button, Divider, InputAdornment, TextField } from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";

interface RootFolderSectionProps {
    value: string;
    onChange: (value: string) => void;
    onLoadMetadata: () => void;
    error?: string;
}

export const RootFolderSection: React.FC<RootFolderSectionProps> = ({
    value,
    onChange,
    onLoadMetadata,
    error,
}) => {
    return (
        <Box sx={{ mb: 4 }}>
            <TextField
                fullWidth
                required
                label="Root folder path"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                error={Boolean(error)}
                helperText={error}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <FolderOpenIcon color="action" />
                        </InputAdornment>
                    ),
                }}
                size="small"
            />

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <Button variant="outlined" onClick={onLoadMetadata}>
                    Load metadata
                </Button>
            </Box>

            <Divider sx={{ mt: 3 }} />
        </Box>
    );
};