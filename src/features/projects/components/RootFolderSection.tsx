import React, { useState } from "react";
import { 
    Box, Button, Divider, InputAdornment, TextField, IconButton, Stack 
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";

// MENTOR FIX: Removed the import of 'normalizeServerFolderPath' because it 
// was deleted from the API file. We now pass the raw string exactly as typed.
import { ServerFolderBrowserDialog } from "./ServerFolderBrowserDialog";

interface RootFolderSectionProps {
    value: string;
    onChange: (value: string) => void;
    onLoadMetadata: () => void;
    error?: string;
}

/**
 * RootFolderSection
 * MENTOR NOTE: This component is now adhering to the Single Responsibility Principle.
 * It manages the visual layout of the input field and delegates the complex folder 
 * browsing logic to the <ServerFolderBrowserDialog /> component.
 */
export const RootFolderSection: React.FC<RootFolderSectionProps> = ({
    value,
    onChange,
    onLoadMetadata,
    error,
}) => {
    // Local state only controls whether the shared modal is visible or not
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <Box sx={{ mb: 4 }}>
            {/* Input and Load Button Layout */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start">
                <TextField
                    fullWidth
                    required
                    label="Root folder path"
                    value={value}
                    // MENTOR FIX: Pass the raw e.target.value directly without normalizing it.
                    // The backend will receive exactly what the user typed or selected.
                    onChange={(e) => onChange(e.target.value)}
                    error={Boolean(error)}
                    helperText={error}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton 
                                    onClick={() => setModalOpen(true)} 
                                    edge="end" 
                                    title="Browse Server Folders"
                                >
                                    <FolderOpenIcon color="primary" />
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                    size="small"
                />

                <Button 
                    variant="outlined" 
                    onClick={onLoadMetadata}
                    sx={{ whiteSpace: 'nowrap', height: '40px' }} 
                >
                    Load metadata
                </Button>
            </Stack>

            <Divider sx={{ mt: 3 }} />

            {/* --- REUSABLE SERVER BROWSER MODAL --- */}
            {/* We pass the current value and receive the new value via onConfirm callback */}
            <ServerFolderBrowserDialog
                open={modalOpen}
                initialPath={value}
                onClose={() => setModalOpen(false)}
                onConfirm={(selectedPath) => {
                    // MENTOR FIX: Pass the raw selectedPath directly.
                    onChange(selectedPath);
                    setModalOpen(false);
                }}
            />
        </Box>
    );
};