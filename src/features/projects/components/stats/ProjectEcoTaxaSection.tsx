import { Alert, Box, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import FolderIcon from "@mui/icons-material/Folder";
import DraftsIcon from "@mui/icons-material/Drafts";
import ImageIcon from "@mui/icons-material/Image";

import type { ProjectStatsEcoTaxa } from "../../api/projectStats.api";
import StatWarning, { StatWarnings } from "./StatWarning";
import StatsSection from "./StatsSection";
import { pluralize } from "./statsFormat";

type StateColor = "success" | "primary";

function ShareRing({ value, color }: { value: number; color: StateColor }) {
    return (
        <Box sx={{ position: "relative", display: "inline-flex" }}>
            <CircularProgress variant="determinate" value={Math.min(100, value)} color={color} size={40} thickness={3} aria-hidden="true" />
            <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography variant="caption" sx={{ fontSize: 10 }}>{`${Math.round(value)}%`}</Typography>
            </Box>
        </Box>
    );
}

function StateRow({ icon, label, hint, value, color }: { icon: React.ReactNode; label: string; hint: string; value: number; color: StateColor }) {
    return (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            {icon}
            <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ textTransform: "uppercase" }}>{label}</Typography>
                <Typography variant="caption" color="text.secondary">{hint}</Typography>
            </Box>
            <ShareRing value={value} color={color} />
        </Stack>
    );
}

const percent = (part: number, total: number) => (total === 0 ? 0 : (part / total) * 100);

/** The EcoTaxa categories used by the project and the classification state of its objects and samples. */
export default function ProjectEcoTaxaSection({ ecotaxa, projectId, ecoTaxaProjectUrl }: { ecotaxa: ProjectStatsEcoTaxa; projectId: number; ecoTaxaProjectUrl?: string }) {
    const { objects, classification } = ecotaxa;
    const states = [
        { key: "validated_objects", icon: <ImageIcon color="success" />, label: "Validated objects", hint: "Share of the objects validated in EcoTaxa", value: percent(objects.validated, objects.total), color: "success" as const },
        { key: "predicted_objects", icon: <ImageIcon color="primary" />, label: "Predicted objects", hint: "Share of the objects predicted, not yet validated", value: percent(objects.predicted, objects.total), color: "primary" as const },
        { key: "fully_validated", icon: <FolderIcon color="success" />, label: "Samples fully validated", hint: "Every object of the sample is validated", value: classification.fully_validated, color: "success" as const },
        { key: "fully_predicted", icon: <FolderIcon color="primary" />, label: "Samples fully predicted", hint: "Every object of the sample is predicted", value: classification.fully_predicted, color: "primary" as const },
        { key: "partially_validated", icon: <DraftsIcon color="success" />, label: "Samples partially validated", hint: "Some objects of the sample are validated", value: classification.partially_validated, color: "success" as const },
        { key: "partially_predicted", icon: <DraftsIcon color="primary" />, label: "Samples partially predicted", hint: "Some objects of the sample are predicted", value: classification.partially_predicted, color: "primary" as const },
    ];

    return (
        <Stack spacing={4}>
            <StatsSection title="EcoTaxa used classification" subtitle="Validated and predicted">
                {ecotaxa.partial && (
                    <Alert severity="info" variant="outlined" role="status" sx={{ mb: 1.5, py: 0 }}>
                        EcoTaxa statistics are being read for {pluralize(ecotaxa.nb_samples_pending, "sample")}, the figures
                        below cover the others and will complete shortly.
                    </Alert>
                )}
                {ecotaxa.categories.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        {ecotaxa.linked ? "No category used yet." : "The project is not linked to an EcoTaxa project."}
                    </Typography>
                ) : (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {ecotaxa.categories.map((category) => <Chip key={category} size="small" label={category} />)}
                    </Box>
                )}
            </StatsSection>

            <StatsSection
                title="EcoTaxa classification state"
                warnings={(ecotaxa.nb_samples_not_imported > 0 || (ecotaxa.linked && !ecotaxa.classification_completed)) && (
                    <StatWarnings>
                        {ecotaxa.nb_samples_not_imported > 0 && (
                            <StatWarning
                                label={`${pluralize(ecotaxa.nb_samples_not_imported, "sample")} not imported in EcoTaxa`}
                                hint="Samples of the project whose images are not in EcoTaxa: import them from the IMPORT tab."
                                to={`/projects/${projectId}/import`}
                            />
                        )}
                        {ecotaxa.linked && !ecotaxa.classification_completed && (
                            <StatWarning
                                label="Classification uncompleted"
                                hint="Some objects of the samples imported in EcoTaxa are neither validated nor predicted yet: classify them in EcoTaxa."
                                href={ecoTaxaProjectUrl}
                            />
                        )}
                    </StatWarnings>
                )}
            >
                <Grid container spacing={2}>
                    {states.map((state) => (
                        <Grid key={state.key} size={{ xs: 12, sm: 6 }}>
                            <StateRow icon={state.icon} label={state.label} hint={state.hint} value={state.value} color={state.color} />
                        </Grid>
                    ))}
                </Grid>
            </StatsSection>
        </Stack>
    );
}
