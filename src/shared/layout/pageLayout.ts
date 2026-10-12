import { compactScreen } from "@/theme";

/** Height of the TopBar (MUI's toolbar height), lowered on compact screens. */
export const APP_BAR_HEIGHT = 64;
export const COMPACT_APP_BAR_HEIGHT = 52;

/** Padding MainLayout puts around every page (theme units). */
const LAYOUT_PADDING = 3;
const COMPACT_LAYOUT_PADDING = 1.5;

export const layoutPaddingSx = { p: LAYOUT_PADDING, [compactScreen]: { p: COMPACT_LAYOUT_PADDING } };

/**
 * Cancels MainLayout's padding for full-bleed pages (home, about) so they run edge to edge right
 * under the TopBar. Tied to `layoutPaddingSx`: a hard-coded offset drifts when the padding changes
 * and the page then overlaps the TopBar.
 */
export const layoutBleedSx = {
    mx: -LAYOUT_PADDING,
    mt: -LAYOUT_PADDING,
    mb: -LAYOUT_PADDING,
    [compactScreen]: { mx: -COMPACT_LAYOUT_PADDING, mt: -COMPACT_LAYOUT_PADDING, mb: -COMPACT_LAYOUT_PADDING },
};

/** A full-bleed block filling the screen below the TopBar. */
export const fullHeightBelowAppBarSx = {
    minHeight: `calc(100vh - ${APP_BAR_HEIGHT}px)`,
    [compactScreen]: { minHeight: `calc(100vh - ${COMPACT_APP_BAR_HEIGHT}px)` },
};

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
