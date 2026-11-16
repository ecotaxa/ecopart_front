import { useState } from "react";
import { InputAdornment, TextField, type SxProps, type Theme } from "@mui/material";

interface BoundedNumberFieldProps {
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    label?: string;
    /** Accessible name when the field has no visible label. */
    ariaLabel?: string;
    unit?: string;
    sx?: SxProps<Theme>;
}

const parse = (text: string) => (text.trim() === "" ? NaN : Number(text));

/**
 * A whole number typed in, next to a slider. It is reported as soon as it lies within
 * [min, max]; anything else shows in error and is given up on leaving the field. A value
 * set elsewhere (the slider, a reset) rewrites the field.
 */
export default function BoundedNumberField({ value, min, max, onChange, label, ariaLabel, unit, sx }: BoundedNumberFieldProps) {
    const [text, setText] = useState(String(value));
    // Adjusted during render, not in an effect, so the field never shows a stale value.
    const [shown, setShown] = useState(value);
    if (shown !== value) {
        setShown(value);
        if (parse(text) !== value) setText(String(value));
    }

    const accepts = (number: number) => Number.isInteger(number) && number >= min && number <= max;

    return (
        <TextField
            size="small"
            label={label}
            value={text}
            error={!accepts(parse(text))}
            onChange={(event) => {
                setText(event.target.value);
                const number = parse(event.target.value);
                if (accepts(number) && number !== value) onChange(number);
            }}
            onBlur={() => {
                if (!accepts(parse(text))) setText(String(value));
            }}
            sx={sx}
            slotProps={{
                htmlInput: { inputMode: "numeric", "aria-label": ariaLabel },
                input: unit ? { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> } : undefined,
            }}
        />
    );
}
