import { useMemo } from "react";
import { Box, Divider, Grid, Paper, Radio, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import LocationOnIcon from "@mui/icons-material/LocationOn";

import SectionCard from "@/shared/components/SectionCard";
import { LocationMap, type MapLocation } from "@/shared/components/map";
import type { Project, SampleData } from "../api/projects.api";
import { formatUtcDateTime } from "../utils/sampleFormat";
import { ReadOnlyField, SubsectionHeader } from "./SampleDetailFields";

const METADATA_LOCATION_COLOR = "#e91e63";
const CTD_LOCATION_COLOR = "#ff9800";

interface LocationOptionProps {
    title: string;
    source: string;
    color: string;
    latitude?: number | null;
    longitude?: number | null;
    selected: boolean;
    available: boolean;
}

/** One location source; the radio only shows which one the sample uses, it cannot be changed here. */
function LocationOption({ title, source, color, latitude, longitude, selected, available }: LocationOptionProps) {
    return (
        <Paper
            variant="outlined"
            sx={(theme) => ({
                display: "flex",
                alignItems: "center",
                gap: 1,
                p: 1.5,
                pl: 1,
                borderRadius: 1,
                opacity: available ? 1 : 0.6,
                ...(selected && {
                    borderColor: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.06),
                }),
            })}
        >
            <Radio
                checked={selected}
                disabled={!available}
                disableRipple
                tabIndex={-1}
                slotProps={{ input: { readOnly: true, "aria-label": title } }}
                sx={{ pointerEvents: "none" }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <LocationOnIcon sx={{ fontSize: 18, color }} />
                    <Typography variant="body2" fontWeight={500}>{title}</Typography>
                </Box>
                <Typography
                    variant="caption"
                    color={available ? "success.main" : "text.secondary"}
                    component="div"
                    sx={{ mb: 1.5 }}
                >
                    {available ? source : "Not available yet"}
                </Typography>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <ReadOnlyField label="Latitude" value={latitude} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <ReadOnlyField label="Longitude" value={longitude} />
                    </Grid>
                </Grid>
            </Box>
        </Paper>
    );
}

const hasCoordinates = (latitude?: number | null, longitude?: number | null) =>
    latitude != null && longitude != null;

/**
 * The sample only stores the operator email; the name comes from the project
 * operator when it is the same person.
 */
const findOperatorName = (project: Project | undefined, operatorEmail?: string | null): string | undefined => {
    const normalize = (email?: string | null) => email?.trim().toLowerCase() ?? "";
    if (!operatorEmail || normalize(project?.operator_email) !== normalize(operatorEmail)) return undefined;
    return project?.operator_name;
};

interface SampleMetadataTabProps {
    project: Project | undefined;
    sample: SampleData;
}

export function SampleMetadataTab({ project, sample }: SampleMetadataTabProps) {
    const operatorName = findOperatorName(project, sample.instrument_operator_email);
    const hasMetadataLocation = hasCoordinates(sample.latitude, sample.longitude);
    // The backend does not fill the CTD location yet: the option stays greyed out until it does.
    const hasCtdLocation = hasCoordinates(sample.ctd_latitude, sample.ctd_longitude);

    const mapLocations = useMemo<MapLocation[]>(() => {
        const locations: MapLocation[] = [];
        if (hasMetadataLocation) {
            locations.push({
                id: "metadata",
                label: "Location from imported metadata",
                latitude: sample.latitude as number,
                longitude: sample.longitude as number,
                color: METADATA_LOCATION_COLOR,
            });
        }
        if (hasCtdLocation) {
            locations.push({
                id: "ctd",
                label: "Location from imported CTD file",
                latitude: sample.ctd_latitude as number,
                longitude: sample.ctd_longitude as number,
                color: CTD_LOCATION_COLOR,
            });
        }
        return locations;
    }, [hasMetadataLocation, hasCtdLocation, sample.latitude, sample.longitude, sample.ctd_latitude, sample.ctd_longitude]);

    return (
        <SectionCard sx={{ p: 0 }}>
            <Typography variant="h6" sx={{ px: { xs: 2.5, md: 3 }, py: 2 }}>Metadata</Typography>
            <Divider />

            <Box sx={{ p: { xs: 2.5, md: 3 }, display: "flex", flexDirection: "column", gap: 4 }}>
                {/* SAMPLE */}
                <Box>
                    <SubsectionHeader title="Sample" />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="Sample ID" value={sample.sample_name} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="Type" value={sample.sample_type_label} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField
                                label="UTC date & time"
                                value={formatUtcDateTime(sample.sampling_utc_date_time, { withPrefix: false })}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="Comment" value={sample.comment} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="Instrument serial number" value={sample.instrument_serial_number} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            {/* Not stored by the backend yet. */}
                            <ReadOnlyField label="Optional id (ARGO, Glider)" value={null} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="Max pressure" value={sample.max_pressure} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField
                                label="Integration time (Time profile) [s]"
                                value={sample.instrument_settings_integration_time}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="Station ID" value={sample.station_id} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="Sampling date" value={formatUtcDateTime(sample.sampling_utc_date_time)} />
                        </Grid>
                    </Grid>
                </Box>

                {/* LOCATION */}
                <Box>
                    <SubsectionHeader title="Location" />
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <LocationMap locations={mapLocations} height={280} />
                        <LocationOption
                            title="Location from imported metadata"
                            source="From local imported data"
                            color={METADATA_LOCATION_COLOR}
                            latitude={sample.latitude}
                            longitude={sample.longitude}
                            selected={hasMetadataLocation}
                            available={hasMetadataLocation}
                        />
                        <LocationOption
                            title="Location from imported CTD file"
                            source="From the imported CTD file"
                            color={CTD_LOCATION_COLOR}
                            latitude={sample.ctd_latitude}
                            longitude={sample.ctd_longitude}
                            selected={false}
                            available={hasCtdLocation}
                        />
                    </Box>
                </Box>

                {/* ENVIRONMENT */}
                <Box>
                    <SubsectionHeader title="Environment" />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="Wind direction (0-360)" value={sample.wind_direction} prefix="Deg" />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="Wind speed" value={sample.wind_speed} prefix="knots" />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="Sea state (1-12)" value={sample.sea_state} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="Nebulousness (0-8)" value={sample.nebulousness} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="Bottom depth" value={sample.bottom_depth} />
                        </Grid>
                    </Grid>
                </Box>

                {/* OPERATOR */}
                <Box>
                    <SubsectionHeader title="Operator" />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="Name" value={operatorName} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="Email" value={sample.instrument_operator_email} />
                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </SectionCard>
    );
}
