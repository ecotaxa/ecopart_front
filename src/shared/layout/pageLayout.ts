import { compactScreen } from "@/theme";

/**
 * Spacing of the header shared by every page (container top, back button, title block, tab bar),
 * tightened on compact screens. Spread into the page's own `sx`: `sx={{ ...pageContainerSx, maxWidth: … }}`.
 */
export const pageContainerSx = { mt: 4, mb: 8, [compactScreen]: { mt: 0, mb: 4 } };

/** The "Back to …" button above the page title. */
export const pageBackButtonSx = { mb: 2, [compactScreen]: { mb: 0.5 } };

/** The block holding the page title (and its actions). */
export const pageHeaderSx = { mb: 4, [compactScreen]: { mb: 1.5 } };

/** The tab bar under the page title. */
export const pageTabsSx = { borderBottom: 1, borderColor: "divider", mb: 3, [compactScreen]: { mb: 1.5 } };
