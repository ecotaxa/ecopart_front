import type { ReactNode } from "react";
import { Box, InputAdornment, TextField, Typography } from "@mui/material";

interface ReadOnlyFieldProps {
    label: string;
    value: ReactNode;
    multiline?: boolean;
    /** Unit shown before the value, e.g. "Deg" or "knots". */
    prefix?: string;
}

/** Read-only field; an empty value shows a dash so the grid keeps its shape. */
export function ReadOnlyField({ label, value, multiline = false, prefix }: ReadOnlyFieldProps) {
    const isEmpty = value === null || value === undefined || value === "";
    const display = isEmpty ? "—" : String(value);
    return (
        <TextField
            fullWidth
            size="small"
            label={label}
            value={display}
            multiline={multiline}
            minRows={multiline ? 4 : undefined}
            slotProps={{
                input: {
                    readOnly: true,
                    startAdornment: prefix && !isEmpty
                        ? <InputAdornment position="start">{prefix}</InputAdornment>
                        : undefined,
                },
                inputLabel: { shrink: true },
            }}
        />
    );
}

export function SubsectionHeader({ title, action }: { title: string; action?: ReactNode }) {
    return (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, minHeight: 36 }}>
            <Typography variant="subtitle1">{title}</Typography>
            {action}
        </Box>
    );
}
