import { MenuItem, TextField } from "@mui/material";

import { PROJECT_PRIVACY_STATUSES, privacyLabel, type PrivacyFilterValue } from "../utils/projectAccess";

interface PrivacyFilterSelectProps {
    value: PrivacyFilterValue;
    onChange: (value: PrivacyFilterValue) => void;
}

/** Narrows a project list to one privacy status ("Any" sends no filter). */
export default function PrivacyFilterSelect({ value, onChange }: PrivacyFilterSelectProps) {
    return (
        <TextField
            select
            size="small"
            label="Privacy"
            value={value}
            onChange={(e) => onChange(e.target.value as PrivacyFilterValue)}
            sx={{ width: 140 }}
        >
            <MenuItem value="any">Any</MenuItem>
            {PROJECT_PRIVACY_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>{privacyLabel(status)}</MenuItem>
            ))}
        </TextField>
    );
}
