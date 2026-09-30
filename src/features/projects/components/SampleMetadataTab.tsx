import { useMemo, useState, type ChangeEvent } from "react";
import {
    Alert, Box, CircularProgress, Divider, Grid, Paper, Radio, RadioGroup, Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import LocationOnIcon from "@mui/icons-material/LocationOn";

import SectionCard from "@/shared/components/SectionCard";
import { LocationMap, type MapLocation } from "@/shared/components/map";
import { selectSampleCoordinates, type Project, type SampleData } from "../api/projects.api";
import { formatUtcDateTime } from "../utils/sampleFormat";
import { ReadOnlyField, SubsectionHeader } from "./SampleDetailFields";

const METADATA_LOCATION_COLOR = "#e91e63";
const CTD_LOCATION_COLOR = "#ff9800";

type LocationSource = "metadata" | "ctd";

interface LocationOptionProps {
    value: LocationSource;
    title: string;
    source: string;
    color: string;
    latitude?: number | null;
    longitude?: number | null;
    selected: boolean;
    available: boolean;
    /** Why the option cannot be selected, shown in place of the source. */
    unavailableReason?: string;
    disabled: boolean;
}

/**
 * One location source, inside the location RadioGroup. The whole card is a
 * <label>, so a click anywhere on it selects its radio.
 */
function LocationOption({
    value, title, source, color, latitude, longitude, selected, available,
    unavailableReason = "No location available", disabled,
}: LocationOptionProps) {
    const isDisabled = disabled || !available;
    return (
        <Paper
            component="label"
            variant="outlined"
            sx={(theme) => ({
                display: "flex",
                alignItems: "center",
                gap: 1,
                p: 1.5,
                pl: 1,
                borderRadius: 1,
                cursor: isDisabled || selected ? "default" : "pointer",
                opacity: available ? 1 : 0.6,
                transition: theme.transitions.create(["border-color", "background-color"]),
                ...(selected
                    ? {
                        borderColor: theme.palette.primary.main,
                        backgroundColor: alpha(theme.palette.primary.main, 0.06),
                    }
                    : !isDisabled && { "&:hover": { borderColor: theme.palette.text.primary } }),
            })}
        >
            <Radio value={value} disabled={isDisabled} slotProps={{ input: { "aria-label": title } }} />
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
                    {available ? source : unavailableReason}
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
    projectId: number;
    project: Project | undefined;
    sample: SampleData;
    /** Called with the sample returned by the backend after the location source changed. */
    onSampleUpdated: (sample: SampleData) => void;
}

export function SampleMetadataTab({ projectId, project, sample, onSampleUpdated }: SampleMetadataTabProps) {
    const operatorName = findOperatorName(project, sample.instrument_operator_email);
    const hasMetadataLocation = hasCoordinates(sample.latitude, sample.longitude);
    // The backend only accepts the CTD location once both CTD coordinates are known.
    const hasCtdLocation = hasCoordinates(sample.ctd_latitude, sample.ctd_longitude);
    const selectedSource: LocationSource = sample.use_ctd_coordinates ? "ctd" : "metadata";

    const [isSavingSource, setIsSavingSource] = useState(false);
    const [sourceError, setSourceError] = useState<string | null>(null);

    const handleSourceChange = async (_event: ChangeEvent<HTMLInputElement>, value: string) => {
        if (isSavingSource || value === selectedSource) return;
        setIsSavingSource(true);
        setSourceError(null);
        try {
            onSampleUpdated(await selectSampleCoordinates(projectId, sample.sample_id, value === "ctd"));
        } catch (err) {
            console.error("[Sample Metadata] Location source update failed", err);
            setSourceError(err instanceof Error ? err.message : "Unknown error while updating the location.");
        } finally {
            setIsSavingSource(false);
        }
    };

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
                    <SubsectionHeader
                        title="Location"
                        action={isSavingSource ? <CircularProgress size={20} aria-label="Saving location" /> : undefined}
                    />
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <LocationMap locations={mapLocations} height={280} />
                        <RadioGroup
                            aria-label="Sample position"
                            value={selectedSource}
                            onChange={handleSourceChange}
                            sx={{ gap: 2 }}
                        >
                            <LocationOption
                                value="metadata"
                                title="Location from imported metadata"
                                source="From local imported data"
                                color={METADATA_LOCATION_COLOR}
                                latitude={sample.latitude}
                                longitude={sample.longitude}
                                selected={selectedSource === "metadata"}
                                available
                                disabled={isSavingSource}
                            />
                            <LocationOption
                                value="ctd"
                                title="Location from imported CTD file"
                                source="From the imported CTD file"
                                color={CTD_LOCATION_COLOR}
                                latitude={sample.ctd_latitude}
                                longitude={sample.ctd_longitude}
                                selected={selectedSource === "ctd"}
                                available={hasCtdLocation}
                                unavailableReason={
                                    sample.ctd_imported
                                        ? "The imported CTD file has no position"
                                        : "No CTD file imported for this sample"
                                }
                                disabled={isSavingSource}
                            />
                        </RadioGroup>
                        {sourceError && (
                            <Alert severity="error" onClose={() => setSourceError(null)}>
                                Failed to update the sample position: {sourceError}
                            </Alert>
                        )}
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
