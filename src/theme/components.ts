import type { Components, Theme } from "@mui/material/styles";
// Registers `MuiDataGrid` in the theme's `components` map.
import type {} from "@mui/x-data-grid/themeAugmentation";

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

    // The one look of every data grid in the app (projects, tasks, samples,
    // admin lists): borderless, quiet header, striped rows, teal selection.
    // Screens only add per-grid deltas through `sx` (e.g. a pointer cursor on
    // clickable rows) instead of re-declaring this block.
    MuiDataGrid: {
        styleOverrides: {
            root: {
                border: "none",
                "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "#ffffff",
                    borderTop: "none",
                    borderBottom: `1px solid ${stone[200]}`,
                    color: "rgba(0, 0, 0, 0.6)",
                    fontWeight: 400,
                },
                "& .MuiDataGrid-columnHeaderTitle": {
                    fontWeight: 500,
                },
                "& .MuiDataGrid-cell": {
                    borderBottom: `1px solid ${stone[100]}`,
                    // Vertically center every cell's content (custom renderCell content
                    // otherwise sticks to the top of the row).
                    display: "flex",
                    alignItems: "center",
                },
                "& .MuiDataGrid-row:nth-of-type(even)": {
                    backgroundColor: stone[50],
                },
                "& .MuiDataGrid-row.Mui-selected": {
                    backgroundColor: secondblue[100],
                    "&:hover": { backgroundColor: secondblue[200] },
                },
                "& .MuiCheckbox-root": { color: stone[400] },
                "& .MuiCheckbox-root.Mui-checked": { color: secondblue[600] },
                "& .MuiDataGrid-footerContainer": {
                    borderTop: `1px solid ${stone[200]}`,
                    minHeight: 40,
                },
                // No focus ring on cells / headers: the grids are read-only lists.
                "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
                    outline: "none",
                },
            },
        },
    },
};
