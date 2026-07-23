import type { ReactNode } from "react";
import { Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

interface InfoTooltipProps {
    /** Rich content shown on hover (string or ReactNode). */
    title: ReactNode;
}

/**
 * Small ⓘ info point reusing the app's MUI Tooltip convention.
 *
 * Single source of truth for the "info icon next to a heading/label" pattern so
 * every screen renders the same widened, readable tooltip instead of re-inventing
 * it. The click guard stops a click on the icon from toggling a switch it sits next to.
 */
export default function InfoTooltip({ title }: InfoTooltipProps) {
    return (
        <Tooltip
            title={title}
            arrow
            placement="right"
            slotProps={{ tooltip: { sx: { maxWidth: 380, p: 1.5 } } }}
        >
            <InfoOutlinedIcon
                fontSize="small"
                onClick={(e) => e.preventDefault()}
                sx={{ color: "action.active", ml: 0.75, verticalAlign: "middle", cursor: "help" }}
            />
        </Tooltip>
    );
}
