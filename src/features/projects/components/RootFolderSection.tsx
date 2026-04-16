import React, { useState, useEffect } from "react";
import {
    Box, Button, Divider, InputAdornment, TextField, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, List,
    ListItemButton, ListItemText, CircularProgress, Typography, Alert,
    Stack, Collapse, ListItemIcon
} from "@mui/material";

import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";

import { getImportFolders } from "../api/projects.api";

// --- 1. RECURSIVE TREE COMPONENT (LAZY LOADING) ---

interface FolderTreeItemProps {
    nodePath: string;
    nodeName: string;
    selectedPath: string;
    onSelect: (path: string) => void;
}

const FolderTreeItem: React.FC<FolderTreeItemProps> = ({ nodePath, nodeName, selectedPath, onSelect }) => {
    const [open, setOpen] = useState(false);
    const [children, setChildren] = useState<string[]>([]);
    const [hasFetched, setHasFetched] = useState(false);
    const [loadingChildren, setLoadingChildren] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isSelected = selectedPath === nodePath;

    const handleToggleAndSelect = async () => {
        onSelect(nodePath);

        const willBeOpen = !open;
        setOpen(willBeOpen);

        if (willBeOpen && !hasFetched) {
            setLoadingChildren(true);
            setError(null);
            try {
                // Call the API
                const data = await getImportFolders(nodePath);
                setChildren(data || []);
                setHasFetched(true);
            } catch (err) {
                console.error("Failed to load subfolders for", nodePath, err);
                setError("Failed to load contents");
            } finally {
                setLoadingChildren(false);
            }
        }
    };

    return (
        <>
            <ListItemButton
                onClick={handleToggleAndSelect}
                selected={isSelected}
                sx={{
                    pl: 2,
                    borderRadius: 1,
                    mb: 0.5,
                    '&.Mui-selected': {
                        backgroundColor: 'primary.light',
                        color: 'primary.contrastText',
                        '&:hover': {
                            backgroundColor: 'primary.main',
                        }
                    },
                    '&.Mui-selected .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                    }
                }}
            >
                <ListItemIcon sx={{ minWidth: 36 }}>
                    {open || isSelected ? <FolderOpenIcon color={isSelected ? "inherit" : "primary"} /> : <FolderIcon color="primary" />}
                </ListItemIcon>

                <ListItemText
                    primary={nodeName}
                    primaryTypographyProps={{
                        fontWeight: isSelected ? 'bold' : 'normal',
                        noWrap: true
                    }}
                />

                {loadingChildren ? (
                    <CircularProgress size={16} sx={{ ml: 1 }} />
                ) : open ? (
                    <ExpandLess />
                ) : (
                    <ExpandMore />
                )}
            </ListItemButton>

            <Collapse in={open} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 3, borderLeft: '1px dashed #e0e0e0', ml: 2 }}>
                    {error && (
                        <Typography variant="caption" color="error" sx={{ pl: 2 }}>{error}</Typography>
                    )}

                    {hasFetched && !loadingChildren && children.length === 0 && !error && (
                        <Typography variant="caption" color="text.secondary" sx={{ pl: 2 }}>(Empty folder)</Typography>
                    )}

                    {children.map((childPath) => {
                        // FIX: Since the backend returns the FULL relative path (e.g., "remote\ftp_plankton"),
                        // we use it directly as the nodePath! NO CONCATENATION needed.
                        const childDisplayName = childPath.split(/[/\\]/).pop() || childPath;

                        return (
                            <FolderTreeItem
                                key={childPath}
                                nodePath={childPath}
                                nodeName={childDisplayName}
                                selectedPath={selectedPath}
                                onSelect={onSelect}
                            />
                        );
                    })}
                </List>
            </Collapse>
        </>
    );
};

// --- 2. MAIN COMPONENT ---

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
    const [modalOpen, setModalOpen] = useState(false);
    const [rootFolders, setRootFolders] = useState<string[]>([]);
    const [loadingRoots, setLoadingRoots] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const [selectedPath, setSelectedPath] = useState<string>("");

    useEffect(() => {
        if (modalOpen) {
            setSelectedPath(value);

            const fetchRoots = async () => {
                setLoadingRoots(true);
                setApiError(null);
                try {
                    const data = await getImportFolders();
                    setRootFolders(data || []);
                } catch (err) {
                    console.error(err);
                    setApiError("Failed to fetch folder list from server.");
                } finally {
                    setLoadingRoots(false);
                }
            };
            fetchRoots();
        }
    }, [modalOpen, value]);

    const handleConfirmSelection = () => {
        onChange(selectedPath);
        setModalOpen(false);
    };

    return (
        <Box sx={{ mb: 4 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start">
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

            <Dialog
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                maxWidth="md"
                fullWidth
                scroll="paper"
                PaperProps={{ sx: { minHeight: '60vh' } }}
            >
                <DialogTitle sx={{ pb: 1 }}>Select Server Import Folder</DialogTitle>

                <Box sx={{ px: 3, pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Selection: <strong>{selectedPath || "None"}</strong>
                    </Typography>
                </Box>

                <DialogContent dividers>
                    {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

                    {loadingRoots ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <CircularProgress />
                        </Box>
                    ) : rootFolders.length === 0 && !apiError ? (
                        <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                            No import folders found on the server.
                        </Typography>
                    ) : (
                        <List sx={{ pt: 0 }}>
                            {rootFolders.map((folderPath) => {
                                const folderName = folderPath.split(/[/\\]/).pop() || folderPath;
                                return (
                                    <FolderTreeItem
                                        key={folderPath}
                                        nodePath={folderPath}
                                        nodeName={folderName}
                                        selectedPath={selectedPath}
                                        onSelect={setSelectedPath}
                                    />
                                );
                            })}
                        </List>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setModalOpen(false)} color="inherit">CANCEL</Button>
                    <Button
                        onClick={handleConfirmSelection}
                        variant="contained"
                        disabled={!selectedPath}
                    >
                        SELECT
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};