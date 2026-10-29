import { useMemo } from "react";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";

import { PolarMap, type MapPoint } from "@/shared/components/map";
import type { ProjectStatsMap } from "../../api/projectStats.api";
import StatWarning, { StatWarnings } from "./StatWarning";
import StatsSection from "./StatsSection";
import { pluralize } from "./statsFormat";

const positionOf = (latitude: number | null, longitude: number | null): { latitude: number; longitude: number } | null =>
    latitude !== null && longitude !== null ? { latitude, longitude } : null;

/**
 * Map of the project's samples: a pin on the position of each sample's metadata,
 * a cross on the position read from its CTD file; both orange when they are too
 * far apart. Warns about samples without CTD file, mismatching positions and
 * positions on land.
 */
export default function ProjectSamplesMap({ map, projectId }: { map: ProjectStatsMap; projectId: number }) {
    const theme = useTheme();
    const sampleColor = theme.palette.primary.main;
    const ctdColor = theme.palette.text.primary;
    const mismatchColor = theme.palette.warning.main;

    const points = useMemo<MapPoint[]>(() => {
        const result: MapPoint[] = [];
        for (const sample of map.samples) {
            const mismatch = sample.coordinates_mismatch;
            const position = positionOf(sample.latitude, sample.longitude);
            const ctd = positionOf(sample.ctd_latitude, sample.ctd_longitude);
            // The backend falls back on the sample position when the CTD one is unknown.
            const ctdUsed = sample.use_ctd_coordinates && ctd !== null;
            const onLand = sample.on_land ? ["Position on land"] : [];
            if (position) {
                result.push({
                    id: `sample-${sample.sample_id}`,
                    ...position,
                    label: sample.sample_name,
                    details: [
                        "Sample position" + (sample.use_ctd_coordinates ? "" : " (used)"),
                        ...(mismatch ? ["CTD position more than 5 km away"] : []),
                        ...(ctdUsed ? [] : onLand),
                    ],
                    color: mismatch ? mismatchColor : sampleColor,
                    shape: "pin",
                });
            }
            if (ctd) {
                result.push({
                    id: `ctd-${sample.sample_id}`,
                    ...ctd,
                    label: `${sample.sample_name} (CTD)`,
                    details: [
                        "CTD position" + (sample.use_ctd_coordinates ? " (used)" : ""),
                        ...(mismatch ? ["Sample position more than 5 km away"] : []),
                        ...(ctdUsed ? onLand : []),
                    ],
                    color: mismatch ? mismatchColor : ctdColor,
                    shape: "cross",
                });
            }
        }
        return result;
    }, [map.samples, sampleColor, ctdColor, mismatchColor]);

    return (
        <StatsSection
            title="Samples distribution"
            warnings={(map.nb_samples_without_ctd > 0 || map.nb_coordinates_mismatches > 0 || map.nb_samples_on_land > 0) && (
                <StatWarnings>
                    {map.nb_samples_without_ctd > 0 && (
                        <StatWarning
                            label={`Missing ${pluralize(map.nb_samples_without_ctd, "CTD file")}`}
                            to={`/projects/${projectId}/import`}
                            hint="Samples without an imported CTD file: import them from the IMPORT tab."
                        />
                    )}
                    {map.nb_coordinates_mismatches > 0 && (
                        <StatWarning
                            label={`Mismatch ${pluralize(map.nb_coordinates_mismatches, "sample")} GPS coordinates`}
                            to={`/projects/${projectId}/data`}
                            hint="The position of the sample metadata and the one read from its CTD file are more than 5 km apart."
                        />
                    )}
                    {map.nb_samples_on_land > 0 && (
                        <StatWarning
                            label={`${pluralize(map.nb_samples_on_land, "sample")} on land`}
                            to={`/projects/${projectId}/data`}
                            hint="The position used is on land, more than 2 km from the sea or a lake (Natural Earth 1:10m): check the coordinates of these samples."
                        />
                    )}
                </StatWarnings>
            )}
        >
            <PolarMap
                points={points}
                height={360}
                emptyMessage="No sample position to show"
                legend={<MapLegend sampleColor={sampleColor} ctdColor={ctdColor} mismatchColor={mismatchColor} />}
            />
        </StatsSection>
    );
}

function LegendItem({ children, label }: { children: React.ReactNode; label: string }) {
    return (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            {children}
            <Typography variant="caption">{label}</Typography>
        </Stack>
    );
}

function MapLegend({ sampleColor, ctdColor, mismatchColor }: { sampleColor: string; ctdColor: string; mismatchColor: string }) {
    return (
        <Stack direction="row" sx={{ flexWrap: "wrap", columnGap: 2.5, rowGap: 0.5, mt: 1 }} aria-label="Map legend">
            <LegendItem label="Sample GPS points">
                <LocationOnIcon sx={{ fontSize: 16, color: sampleColor }} aria-hidden="true" />
            </LegendItem>
            <LegendItem label="CTD GPS points">
                <Typography component="span" sx={{ color: ctdColor, fontWeight: 700, lineHeight: 1, fontSize: 14 }} aria-hidden="true">✕</Typography>
            </LegendItem>
            <LegendItem label="Mismatching positions">
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: mismatchColor }} />
            </LegendItem>
        </Stack>
    );
}
