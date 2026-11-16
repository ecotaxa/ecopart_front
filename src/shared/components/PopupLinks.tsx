import { Link as RouterLink } from "react-router-dom";
import { Link, Stack } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

/** A link of a map or chart popup, to the page of what the popup names. */
export interface PopupLink {
    label: string;
    /** Path inside the application. */
    to: string;
    /** Opens in a new tab, e.g. to keep a selection that only lives in the state of the page. */
    newTab?: boolean;
}

/** The links under the text of a map or chart popup. */
export default function PopupLinks({ links }: { links?: PopupLink[] }) {
    if (!links?.length) return null;
    return (
        <Stack direction="row" sx={{ flexWrap: "wrap", columnGap: 1.5, mt: 0.5 }}>
            {links.map((link) => (
                <Link
                    key={link.to}
                    component={RouterLink}
                    to={link.to}
                    variant="caption"
                    underline="hover"
                    sx={{ fontWeight: 500 }}
                    {...(link.newTab ? { target: "_blank", rel: "noopener", title: `${link.label} in a new tab` } : {})}
                >
                    {link.label}
                    {link.newTab && <OpenInNewIcon aria-hidden sx={{ fontSize: 12, ml: 0.25, verticalAlign: "-2px" }} />}
                </Link>
            ))}
        </Stack>
    );
}
