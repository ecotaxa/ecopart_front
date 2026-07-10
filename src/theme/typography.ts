import type { TypographyVariantsOptions } from "@mui/material/styles";

/**
 * EcoPart typography — ported from the EcoTaxa design system.
 * Body copy uses "Source Sans 3", interactive/button labels use "Dosis",
 * and monospace uses "Source Code Pro" (loaded via Google Fonts in index.html).
 */
const bodyFont = [
    '"Source Sans 3"',
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    '"Segoe UI"',
    "Roboto",
    '"Helvetica Neue"',
    "Arial",
    "sans-serif",
].join(",");

const displayFont = [
    '"Dosis"',
    '"Source Sans 3"',
    "ui-sans-serif",
    "system-ui",
    "sans-serif",
].join(",");

export const typography: TypographyVariantsOptions = {
    fontFamily: bodyFont,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: { fontFamily: displayFont, fontWeight: 700, fontSize: "1.875rem", lineHeight: 1.2 },
    h2: { fontFamily: displayFont, fontWeight: 700, fontSize: "1.625rem", lineHeight: 1.25 },
    h3: { fontFamily: displayFont, fontWeight: 600, fontSize: "1.5rem", lineHeight: 1.3 },
    h4: { fontFamily: displayFont, fontWeight: 600, fontSize: "1.375rem", lineHeight: 1.35 },
    h5: { fontFamily: displayFont, fontWeight: 600, fontSize: "1.25rem", lineHeight: 1.4 },
    h6: { fontFamily: displayFont, fontWeight: 600, fontSize: "1.125rem", lineHeight: 1.4 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 600 },
    body1: { fontWeight: 400, lineHeight: 1.5 },
    body2: { fontWeight: 400, lineHeight: 1.45 },
    button: {
        fontFamily: displayFont,
        fontWeight: 600,
        letterSpacing: "0.01em",
        textTransform: "none",
    },
    caption: { fontWeight: 400 },
    overline: { fontFamily: displayFont, fontWeight: 600, letterSpacing: "0.08em" },
};
