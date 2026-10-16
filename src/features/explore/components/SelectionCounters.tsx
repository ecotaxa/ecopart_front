import Grid from "@mui/material/Grid";
import SailingIcon from "@mui/icons-material/Sailing";
import CollectionsIcon from "@mui/icons-material/Collections";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PhotoCameraBackIcon from "@mui/icons-material/PhotoCameraBack";

import StatCard, { STAT_CARD_COLORS } from "@/shared/components/StatCard";
import type { ExploreSummary } from "../types/explore.types";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** The four headline counters of a selection; "—" while nothing is selected. */
export default function SelectionCounters({ counts }: { counts: ExploreSummary["counts"] | null }) {
    const cards = [
        { label: "Projects", value: counts?.projects, icon: <SailingIcon /> },
        { label: "Samples", value: counts?.samples, icon: <CollectionsIcon /> },
        { label: "Particles", value: counts?.particles, icon: <AutoAwesomeIcon /> },
        { label: "Images", value: counts?.images, icon: <PhotoCameraBackIcon /> },
    ];

    return (
        <Grid container spacing={2.5}>
            {cards.map((card, index) => (
                <Grid key={card.label} size={{ xs: 6, md: 3 }}>
                    <StatCard
                        label={card.label}
                        value={card.value == null ? null : compact.format(card.value)}
                        color={STAT_CARD_COLORS[index]}
                        icon={card.icon}
                    />
                </Grid>
            ))}
        </Grid>
    );
}
