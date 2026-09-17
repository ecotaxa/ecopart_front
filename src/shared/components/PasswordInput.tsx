import { useState } from "react";
import { TextField, InputAdornment, IconButton, type TextFieldProps } from "@mui/material";

// Standard MUI icons for password visibility
// See: https://mui.com/material-ui/react-text-field/#input-adornments
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

/**
 * Reusable Password Input component.
 * Centralizes the icon logic so it looks the same everywhere in the app.
 */
export const PasswordInput = ({ slotProps, ...props }: TextFieldProps) => {
    const [showPassword, setShowPassword] = useState(false);

    const handleClickShowPassword = () => setShowPassword((show) => !show);

    // Prevent the button from stealing focus when clicked (keeps keyboard on input)
    const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    };

    return (
        <TextField
            {...props}
            // Toggle between text (visible) and password (hidden)
            type={showPassword ? "text" : "password"}
            slotProps={{
                ...slotProps,
                input: {
                    ...(slotProps?.input as object | undefined),
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                                aria-label="toggle password visibility"
                                // Explicit type so the toggle never submits an enclosing <form>.
                                type="button"
                                onClick={handleClickShowPassword}
                                onMouseDown={handleMouseDownPassword}
                                edge="end"
                            >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                        </InputAdornment>
                    ),
                },
            }}
        />
    );
};
