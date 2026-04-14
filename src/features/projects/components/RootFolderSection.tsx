import React, { useRef, useEffect } from "react";
import {
    Box,
    TextField,
    Button,
    InputAdornment,
    IconButton
} from "@mui/material";
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';

interface RootFolderSectionProps {
    // The current string value of the root folder path
    value: string;
    // Callback to update the string
    onChange: (value: string) => void;
    // Callback when the user clicks the "Load metadata" button
    onLoadMetadata: () => void;
}

/**
 * DUMB COMPONENT (Presenter)
 * Handles the top section containing the root folder path and the load metadata button.
 */
export const RootFolderSection: React.FC<RootFolderSectionProps> = ({
    value,
    onChange,
    onLoadMetadata
}) => {
    // 1. Create a reference to link to the hidden HTML input
    const hiddenFileInputRef = useRef<HTMLInputElement>(null);

    // Use useEffect to set non-standard attributes to avoid 'any' casting in JSX
    useEffect(() => {
        if (hiddenFileInputRef.current) {
            hiddenFileInputRef.current.setAttribute("webkitdirectory", "true");
            hiddenFileInputRef.current.setAttribute("directory", "true");
        }
    }, []);

    // 2. Function triggered when clicking the MUI Icon
    const handleIconClick = () => {
        // Programmatically trigger a click on the hidden input
        hiddenFileInputRef.current?.click();
    };

    // 3. Function triggered when the user finishes selecting a folder in the OS dialog
    const handleFolderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            // Because of browser security, we cannot get the full absolute path (e.g., C:/...)
            // 'webkitRelativePath' gives us the relative structure (e.g., "my_folder/file1.txt")
            const relativePath = files[0].webkitRelativePath;

            if (relativePath) {
                // We extract just the root folder name selected by the user
                const selectedFolderName = relativePath.split('/')[0];
                onChange(selectedFolderName);
            }

            // Reset the input so the user can select the same folder again if needed
            event.target.value = '';
        }
    };
    return (
        // Flexbox container: Row on desktop (md), Column on mobile (xs)
        <Box
            sx={{
                mb: 5,
                display: 'flex',
                gap: 2,
                alignItems: 'flex-start',
                flexDirection: { xs: 'column', md: 'row' }
            }}
        >
            {/* HIDDEN HTML FILE INPUT */}
            <input
                type="file"
                ref={hiddenFileInputRef}
                onChange={handleFolderChange}
                style={{ display: 'none' }} // This makes it invisible!
            />
            <TextField
                fullWidth
                label="Root folder path*"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                size="small"
                slotProps={{
                    input: {
                        // Adds the folder icon at the end of the input
                        endAdornment: (
                            <InputAdornment position="end">
                                {/* IconButton makes the icon clickable if you ever want to open a file picker later */}
                                <IconButton edge="end" size="small" onClick={handleIconClick} disableRipple>
                                    <FolderOutlinedIcon />
                                </IconButton>
                            </InputAdornment>
                        ),
                    }
                }}
            />
            <Button
                variant="outlined"
                onClick={onLoadMetadata}
                sx={{
                    minWidth: 150,
                    textTransform: 'none', // Prevents ALL CAPS to match the mockup exact casing
                    height: 40 // Matches the height of a size="small" TextField
                }}
            >
                Load metadata
            </Button>
        </Box>
    );
};