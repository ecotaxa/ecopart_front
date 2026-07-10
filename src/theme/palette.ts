import type { PaletteOptions } from "@mui/material/styles";

/**
 * EcoPart visual identity — ported from the EcoTaxa design system
 * (source: ecotaxa_front `dev_gui/tailwind.config.js`).
 *
 * These are the raw brand colour scales. They are re-exported so they can be
 * consumed directly in `sx` props (e.g. `ecotaxaColors.mainblue[100]`) for the
 * cases MUI's semantic palette does not cover (gradients, hover tints, …).
 */
export const ecotaxaColors = {
    // Primary — deep marine blue
    mainblue: {
        50: "#f3f7f8",
        100: "#d8f0f9",
        200: "#ade1f3",
        300: "#79c3e2",
        400: "#42a0cc",
        500: "#3180b6",
        600: "#2a669d",
        700: "#244d7c",
        800: "#1a3459",
        900: "#10203b",
    },
    // EcoPart brand — teal (this scale drives primary, the header gradient and
    // every light accent; change these 10 shades to re-theme the whole app)
    secondblue: {
        50: "#f1f6f6",
        100: "#d5f0f5",
        200: "#a6e4ea",
        300: "#6ec8cf",
        400: "#34a7ad",
        500: "#258a8b",
        600: "#207171",
        700: "#1d5658",
        800: "#163b40",
        900: "#0e242d",
    },
    // Neutral greys
    stone: {
        50: "#f8faf9",
        100: "#eef1f4",
        200: "#d9dee7",
        300: "#b2bbc9",
        400: "#8593a4",
        500: "#687182",
        600: "#535664",
        700: "#40404b",
        800: "#2c2b34",
        900: "#1a1a21",
    },
    // Semantic
    success: {
        50: "#f0f5f4",
        100: "#d6eff0",
        200: "#a5e5dc",
        300: "#6ccab7",
        400: "#2fab8c",
        500: "#218f65",
        600: "#1d784e",
        700: "#1b5c3e",
        800: "#14402f",
        900: "#0e2823",
    },
    danger: {
        50: "#fdfbf9",
        100: "#fbf0e2",
        200: "#f7d3c3",
        300: "#eba894",
        400: "#e47966",
        500: "#d35643",
        600: "#b93c2d",
        700: "#912d22",
        800: "#661f18",
        900: "#3f130e",
    },
    warning: {
        50: "#fefce8",
        100: "#fef9c3",
        200: "#fef08a",
        300: "#fde047",
        400: "#facc15",
        500: "#eab308",
        600: "#ca8a04",
        700: "#a16207",
        800: "#854d0e",
        900: "#713f12",
    },
    info: {
        50: "#f6f9f9",
        100: "#e4f1f8",
        200: "#c3e0f0",
        300: "#92c0db",
        400: "#5c9bbf",
        500: "#4579a3",
        600: "#385e87",
        700: "#2d4767",
        800: "#1f2f48",
        900: "#131c2e",
    },
} as const;

const { mainblue, secondblue, stone, success, danger, warning, info } =
    ecotaxaColors;

export const palette: PaletteOptions = {
    mode: "light",
    // EcoPart is a sibling of EcoTaxa: it shares the exact same design system
    // but is *teal-led* instead of *blue-led*, so users can tell the two apps
    // apart at a glance. Teal (`secondblue`) becomes the primary brand colour,
    // and EcoTaxa's marine blue (`mainblue`) is kept as the secondary accent.
    primary: {
        main: secondblue[600], // #207171 — teal, AA-contrast with white text
        light: secondblue[400],
        dark: secondblue[800],
        contrastText: "#ffffff",
    },
    secondary: {
        main: mainblue[700],
        light: mainblue[500],
        dark: mainblue[800],
        contrastText: "#ffffff",
    },
    error: {
        main: danger[500],
        light: danger[400],
        dark: danger[600],
        contrastText: "#ffffff",
    },
    warning: {
        main: warning[500],
        light: warning[400],
        dark: warning[600],
        contrastText: stone[900],
    },
    info: {
        main: info[500],
        light: info[400],
        dark: info[600],
        contrastText: "#ffffff",
    },
    success: {
        main: success[500],
        light: success[400],
        dark: success[600],
        contrastText: "#ffffff",
    },
    grey: {
        50: stone[50],
        100: stone[100],
        200: stone[200],
        300: stone[300],
        400: stone[400],
        500: stone[500],
        600: stone[600],
        700: stone[700],
        800: stone[800],
        900: stone[900],
    },
    background: {
        default: stone[50],
        paper: "#ffffff",
    },
    text: {
        primary: stone[800],
        secondary: stone[600],
        disabled: stone[400],
    },
    divider: stone[200],
};
