import { createTheme } from "@mui/material/styles";

import { palette, ecotaxaColors } from "./palette";
import { typography } from "./typography";
import { components } from "./components";

export const theme = createTheme({
    palette,
    typography,
    components,
    shape: {
        borderRadius: 4,
    },
});

// Re-exported so brand colour scales are reachable from `sx` props where MUI's
// semantic palette is not enough (gradients, hover tints, …).
export { ecotaxaColors };
