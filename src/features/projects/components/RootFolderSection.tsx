import React, { useState } from "react";
import {
    Box, Button, Divider, InputAdornment, TextField, IconButton, Stack
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";

// The raw string is passed exactly as typed / selected: the backend owns path normalisation.
import { ServerFolderBrowserDialog } from "./ServerFolderBrowserDialog";

interface RootFolderSectionProps {
    value: string;
    onChange: (value: string) => void;
    /** When provided, renders the "Load metadata" button (project creation only). */
    onLoadMetadata?: () => void;
    error?: string;
}

/**
 * RootFolderSection
 *  NOTE: This component is now adhering to the Single Responsibility Principle.
 * It manages the visual layout of the input field and delegates the complex folder 
 * browsing logic to the <ServerFolderBrowserDialog /> component.
 */
const RootFolderSectionImpl: React.FC<RootFolderSectionProps> = ({
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
                    //   Pass the raw e.target.value directly without normalizing it.
                    // The backend will receive exactly what the user typed or selected.
                    onChange={(e) => onChange(e.target.value)}
                    error={Boolean(error)}
                    helperText={error}
                    slotProps={{
                        input: {
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setModalOpen(true)}
                                        edge="end"
                                        title="Browse Server Folders"
                                        aria-label="Browse server folders"
                                    >
                                        <FolderOpenIcon color="primary" />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        },
                    }}
                    size="small"
                />

                {onLoadMetadata && (
                    <Button
                        variant="outlined"
                        onClick={onLoadMetadata}
                        sx={{ whiteSpace: 'nowrap', height: '40px' }}
                    >
                        Load metadata
                    </Button>
                )}
            </Stack>

            <Divider sx={{ mt: 3 }} />

            {/* --- REUSABLE SERVER BROWSER MODAL --- */}
            {/* We pass the current value and receive the new value via onConfirm callback */}
            <ServerFolderBrowserDialog
                open={modalOpen}
                initialPath={value}
                onClose={() => setModalOpen(false)}
                onConfirm={(selectedPath) => {
                    //   Pass the raw selectedPath directly.
                    onChange(selectedPath);
                    setModalOpen(false);
                }}
            />
        </Box>
    );
};

/**
 * Memoized: the project form keeps every section's handlers stable, so typing
 * in one section re-renders only that section instead of the whole form.
 */
export const RootFolderSection = React.memo(RootFolderSectionImpl);
