import { ecotaxaColors } from "@/theme";

/**
 * Ordered palette for chart series / categorical slices.
 *
 * Uses the same `mainblue` scale as the QC import profile charts
 * (QcSampleCard: pressure = mainblue[500], pixel classes = mainblue[400/600/800])
 * so the admin dashboard reads as one system with the rest of the app. Shades
 * are ordered for maximum contrast between adjacent series, and cycled when a
 * chart has more series than colours.
 */
export const chartColors = [
    ecotaxaColors.mainblue[500],
    ecotaxaColors.mainblue[800],
    ecotaxaColors.mainblue[400],
    ecotaxaColors.mainblue[600],
    ecotaxaColors.mainblue[300],
    ecotaxaColors.mainblue[700],
    ecotaxaColors.mainblue[200],
    ecotaxaColors.mainblue[900],
] as const;

/** Colour for the series at `index`, wrapping around the palette. */
export function chartColorAt(index: number): string {
    return chartColors[index % chartColors.length];
}
