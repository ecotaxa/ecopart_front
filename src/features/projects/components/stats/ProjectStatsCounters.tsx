import Grid from "@mui/material/Grid";
import SailingIcon from "@mui/icons-material/Sailing";
import CollectionsIcon from "@mui/icons-material/Collections";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PhotoCameraBackIcon from "@mui/icons-material/PhotoCameraBack";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import StatCard, { STAT_CARD_COLORS } from "@/shared/components/StatCard";
import type { ProjectStatsCounts } from "../../api/projectStats.api";
import { formatCompact } from "./statsFormat";

/** The five headline counters of a project. */
export default function ProjectStatsCounters({ counts }: { counts: ProjectStatsCounts }) {
    const cards = [
        { label: "Stations", value: counts.stations, icon: <SailingIcon /> },
        { label: "Samples", value: counts.samples, icon: <CollectionsIcon /> },
        { label: "Particles", value: counts.particles, icon: <AutoAwesomeIcon /> },
        { label: "Vignettes", value: counts.vignettes, icon: <PhotoCameraBackIcon /> },
        { label: "Exports", value: counts.exports, icon: <UploadFileIcon /> },
    ];

    return (
        <Grid container spacing={2.5}>
            {cards.map((card, index) => (
                <Grid key={card.label} size={{ xs: 6, sm: 4, md: 2.4 }}>
                    <StatCard label={card.label} value={formatCompact(card.value)} color={STAT_CARD_COLORS[index]} icon={card.icon} />
                </Grid>
            ))}
        </Grid>
    );
}
