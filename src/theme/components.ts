import type { Components, Theme } from "@mui/material/styles";

import { ecotaxaColors } from "./palette";

const { secondblue, stone } = ecotaxaColors;

/**
 * MUI component overrides reproducing EcoTaxa's UI signature — but tuned to
 * EcoPart's teal-led variant: a teal gradient header (EcoTaxa uses marine
 * blue), soft-shadowed rounded buttons with the Dosis label font, teal-focused
 * form fields and a lightly tinted text selection.
 */
export const components: Components<Theme> = {
    MuiCssBaseline: {
        styleOverrides: {
            "::selection": {
                backgroundColor: secondblue[100],
                color: stone[600],
            },
        },
    },

    MuiAppBar: {
        defaultProps: {
            color: "primary",
            elevation: 0,
        },
        styleOverrides: {
            root: {
                backgroundImage: `linear-gradient(90deg, ${secondblue[800]} 0%, ${secondblue[500]} 100%)`,
                color: "#ffffff",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.12)",
            },
        },
    },

    MuiButton: {
        defaultProps: {
            disableElevation: false,
        },
        styleOverrides: {
            root: {
                borderRadius: 4,
                boxShadow: "none",
                transition: "all 0.3s ease-in-out",
            },
            contained: {
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1), 0 1px 1px rgba(0, 0, 0, 0.06)",
                "&:hover": {
                    boxShadow: "none",
                },
            },
        },
    },

    MuiPaper: {
        styleOverrides: {
            root: {
                backgroundImage: "none",
            },
            rounded: {
                borderRadius: 8,
            },
        },
    },

    MuiOutlinedInput: {
        styleOverrides: {
            root: {
                "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: stone[300],
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: secondblue[300],
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: secondblue[400],
                    borderWidth: 2,
                },
            },
        },
    },

    MuiLink: {
        defaultProps: {
            underline: "hover",
        },
    },
};
