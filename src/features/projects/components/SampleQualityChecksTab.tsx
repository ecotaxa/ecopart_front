import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Alert, AlertTitle, Box, Button, CircularProgress, Divider, Grid, Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ImageIcon from "@mui/icons-material/Image";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import SectionCard from "@/shared/components/SectionCard";
import { LocationMap } from "@/shared/components/map";
import { confirmDialog } from "@/shared/confirm/confirm.store";
import {
    getEcoTaxaSampleStats, getSampleQcGraphs, setSampleVisualQc,
    type EcoTaxaSampleData, type SampleData,
} from "../api/projects.api";
import { formatUtcDateTime } from "../utils/sampleFormat";
import { buildSampleMapLocations } from "../utils/sampleLocations";
import { ReadOnlyField, SubsectionHeader } from "./SampleDetailFields";
import { QcSampleGraphs } from "./QcSampleCard";

const QC_STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Pending", color: "info.main" },
    VALIDATED: { label: "Validated", color: "success.main" },
    REJECTED: { label: "Rejected", color: "error.main" },
};

/** The backend sends the validator as "first last (email)"; the email has its own field. */
const stripEmail = (validator?: string | null): string | null =>
    validator?.replace(/\s*\([^)]*\)\s*$/, "").trim() || null;

interface VisualQcSectionProps {
    projectId: number;
    sample: SampleData;
    onSampleUpdated: (sample: SampleData) => void;
}

function VisualQcSection({ projectId, sample, onSampleUpdated }: VisualQcSectionProps) {
    const [isValidating, setIsValidating] = useState(false);
    const [validateError, setValidateError] = useState<string | null>(null);

    const statusLabel = sample.visual_qc_status_label ?? "PENDING";
    const status = QC_STATUS_DISPLAY[statusLabel] ?? { label: statusLabel, color: "text.primary" };
    const isPending = statusLabel === "PENDING";

    const handleValidate = async () => {
        if (!(await confirmDialog({
            title: `Validate the QC of "${sample.sample_name}"`,
            message: "The sample will be marked as validated, which allows it to be sent to EcoTaxa and exported.",
            confirmLabel: "Validate",
        }))) return;

        setIsValidating(true);
        setValidateError(null);
        try {
            onSampleUpdated(await setSampleVisualQc(projectId, sample.sample_id, "VALIDATED"));
        } catch (err) {
            console.error("[Sample Quality checks] Validation failed", err);
            setValidateError(err instanceof Error ? err.message : "Unknown error while validating the sample.");
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <Box>
            <SubsectionHeader title="Visual QC" />
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <ReadOnlyField label="Visual QC status" value={status.label} valueColor={status.color} />
                </Grid>
                {isPending ? (
                    <Grid size={{ xs: 12, md: 6 }} sx={{ display: "flex", alignItems: "center" }}>
                        <Button variant="outlined" color="success" onClick={handleValidate} disabled={isValidating}>
                            {isValidating ? "Validating..." : "Validate QC"}
                        </Button>
                    </Grid>
                ) : (
                    <>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField
                                label="UTC date time"
                                value={formatUtcDateTime(sample.visual_qc_validation_utc_date_time, { withPrefix: false })}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField
                                label={statusLabel === "REJECTED" ? "Rejected by" : "Validated by"}
                                value={stripEmail(sample.visual_qc_validator_user)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="Email" value={sample.visual_qc_validator_email} />
                        </Grid>
                        {sample.visual_qc_comment && (
                            <Grid size={{ xs: 12 }}>
                                <ReadOnlyField label="Comment" value={sample.visual_qc_comment} />
                            </Grid>
                        )}
                    </>
                )}
            </Grid>
            {validateError && (
                <Alert severity="error" onClose={() => setValidateError(null)} sx={{ mt: 2 }}>
                    Failed to validate the sample: {validateError}
                </Alert>
            )}
        </Box>
    );
}

function QcGraphsSection({ projectId, sample }: { projectId: number; sample: SampleData }) {
    const { data: graphs, isLoading, error } = useQuery({
        queryKey: ["projects", projectId, "samples", sample.sample_id, "qc-graphs"],
        queryFn: () => getSampleQcGraphs(projectId, sample.sample_id),
    });

    return (
        <Box>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                Sample : {sample.sample_name}
            </Typography>
            {isLoading ? (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 6, gap: 2 }}>
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary">Computing QC graphs…</Typography>
                </Box>
            ) : error || !graphs ? (
                <Alert severity="warning">
                    <AlertTitle>QC graphs unavailable</AlertTitle>
                    {error instanceof Error ? error.message : "The QC graphs could not be computed."}
                </Alert>
            ) : (
                <QcSampleGraphs sample={graphs} />
            )}
        </Box>
    );
}

function StationLocationSection({ sample }: { sample: SampleData }) {
    const { latitude, longitude, ctd_latitude, ctd_longitude } = sample;
    const mapLocations = useMemo(
        () => buildSampleMapLocations({ latitude, longitude, ctd_latitude, ctd_longitude }),
        [latitude, longitude, ctd_latitude, ctd_longitude],
    );
    // The position not used by the sample (selected in the Metadata tab) is greyed out.
    const usesCtd = sample.use_ctd_coordinates === true;

    return (
        <Box>
            <SubsectionHeader title="Station location" />
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <LocationMap locations={mapLocations} height={280} />
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <ReadOnlyField label="Station ID" value={sample.station_id} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }} />
                    <Grid size={{ xs: 12, md: 6 }}>
                        <ReadOnlyField label="Sample Latitude" value={latitude} disabled={usesCtd} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <ReadOnlyField label="Sample Longitude" value={longitude} disabled={usesCtd} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <ReadOnlyField label="CTD Latitude" value={ctd_latitude} disabled={!usesCtd} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <ReadOnlyField label="CTD Longitude" value={ctd_longitude} disabled={!usesCtd} />
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
}

interface TaxonomyRowProps {
    label: string;
    count: number;
    total: number;
    color: string;
}

function TaxonomyRow({ label, count, total, color }: TaxonomyRowProps) {
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
                sx={(theme) => ({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: 1,
                    flexShrink: 0,
                    color,
                    backgroundColor: alpha(theme.palette.text.primary, 0.06),
                })}
            >
                <ImageIcon fontSize="small" />
            </Box>
            <Box sx={{ width: { xs: 160, sm: 220 } }}>
                <Typography variant="body2" sx={{ textTransform: "uppercase" }}>{label}</Typography>
                <Typography variant="caption" color="text.secondary">
                    {count} / {total} objects
                </Typography>
            </Box>
            <Box sx={{ position: "relative", display: "inline-flex" }}>
                <CircularProgress
                    variant="determinate"
                    value={100}
                    size={40}
                    thickness={3}
                    sx={(theme) => ({ color: alpha(theme.palette.text.primary, 0.08) })}
                />
                <CircularProgress
                    variant="determinate"
                    value={percent}
                    size={40}
                    thickness={3}
                    aria-label={`${label}: ${percent}%`}
                    sx={{ color, position: "absolute", left: 0 }}
                />
                <Typography
                    variant="caption"
                    sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}
                >
                    {percent}%
                </Typography>
            </Box>
        </Box>
    );
}

const isClassificationComplete = (stats: EcoTaxaSampleData) =>
    stats.nb_objects > 0 && stats.nb_validated === stats.nb_objects;

function TaxonomySection({ projectId, sample }: { projectId: number; sample: SampleData }) {
    const isInEcoTaxa = sample.ecotaxa_sample_imported !== false && sample.ecotaxa_sample_id != null;
    const { data: stats, isLoading, error } = useQuery({
        queryKey: ["projects", projectId, "samples", sample.sample_id, "ecotaxa-stats"],
        queryFn: () => getEcoTaxaSampleStats(projectId, sample.sample_id),
        enabled: isInEcoTaxa,
    });

    const completion = stats && (isClassificationComplete(stats) ? (
        <Typography variant="button" color="success.main" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <CheckCircleOutlineIcon fontSize="small" /> Classification completed
        </Typography>
    ) : (
        <Typography variant="button" color="warning.main" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <WarningAmberIcon fontSize="small" /> Classification uncompleted
        </Typography>
    ));

    const renderContent = () => {
        if (!isInEcoTaxa) {
            return (
                <Typography variant="body2" color="text.secondary">
                    This sample is not imported in EcoTaxa.
                </Typography>
            );
        }
        if (isLoading) return <CircularProgress size={24} />;
        if (error) {
            return (
                <Alert severity="warning">
                    Failed to load the EcoTaxa classification{error instanceof Error ? ` (${error.message})` : ""}.
                </Alert>
            );
        }
        if (!stats) {
            return (
                <Typography variant="body2" color="text.secondary">
                    No classification found in EcoTaxa for this sample.
                </Typography>
            );
        }
        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TaxonomyRow label="Validated objects" count={stats.nb_validated} total={stats.nb_objects} color="success.main" />
                <TaxonomyRow label="Predicted objects" count={stats.nb_predicted} total={stats.nb_objects} color="primary.main" />
                {/* Not in the mockup, but without it the percentages would not add up. */}
                {stats.nb_dubious > 0 && (
                    <TaxonomyRow label="Dubious objects" count={stats.nb_dubious} total={stats.nb_objects} color="warning.main" />
                )}
                <TaxonomyRow label="Unclassified objects" count={stats.nb_unclassified} total={stats.nb_objects} color="text.secondary" />
            </Box>
        );
    };

    return (
        <Box>
            <SubsectionHeader title="Taxonomy" action={completion} />
            {renderContent()}
        </Box>
    );
}

interface SampleQualityChecksTabProps {
    projectId: number;
    sample: SampleData;
    /** Called with the sample returned by the backend after the QC was validated. */
    onSampleUpdated: (sample: SampleData) => void;
}

export function SampleQualityChecksTab({ projectId, sample, onSampleUpdated }: SampleQualityChecksTabProps) {
    return (
        <SectionCard sx={{ p: 0 }}>
            <Typography variant="h6" sx={{ px: { xs: 2.5, md: 3 }, py: 2 }}>Quality checks</Typography>
            <Divider />

            <Box sx={{ p: { xs: 2.5, md: 3 }, display: "flex", flexDirection: "column", gap: 5 }}>
                <VisualQcSection projectId={projectId} sample={sample} onSampleUpdated={onSampleUpdated} />
                <QcGraphsSection projectId={projectId} sample={sample} />
                <StationLocationSection sample={sample} />
                <TaxonomySection projectId={projectId} sample={sample} />
            </Box>
        </SectionCard>
    );
}
