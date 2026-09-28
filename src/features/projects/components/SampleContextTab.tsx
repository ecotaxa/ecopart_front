import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Divider, Grid, TextField, Tooltip, Typography } from "@mui/material";

import SectionCard from "@/shared/components/SectionCard";
import { useEcoTaxaInstances } from "@/shared/api/referenceData.hooks";
import type { Project, SampleData } from "../api/projects.api";
import { buildEcoTaxaSampleUrl } from "../utils/ecotaxaLinks";

interface SampleContextTabProps {
    project: Project | undefined;
    sample: SampleData;
}

/** "2022-12-05T15:14:44.000Z" -> "UTC  2022-12-05 15:14:44"; empty when missing or unparsable. */
const formatUtcDateTime = (value?: string | null): string => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return `UTC  ${date.toISOString().slice(0, 19).replace("T", " ")}`;
};

/** Read-only field; an empty value shows a dash so the grid keeps its shape. */
function ReadOnlyField({ label, value, multiline = false }: { label: string; value: ReactNode; multiline?: boolean }) {
    const display = value === null || value === undefined || value === "" ? "—" : String(value);
    return (
        <TextField
            fullWidth
            size="small"
            label={label}
            value={display}
            multiline={multiline}
            minRows={multiline ? 4 : undefined}
            slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }}
        />
    );
}

function SubsectionHeader({ title, action }: { title: string; action?: ReactNode }) {
    return (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, minHeight: 36 }}>
            <Typography variant="subtitle1">{title}</Typography>
            {action}
        </Box>
    );
}

export function SampleContextTab({ project, sample }: SampleContextTabProps) {
    const navigate = useNavigate();

    const { data: ecoTaxaInstances } = useEcoTaxaInstances();
    const ecoTaxaInstanceUrl = ecoTaxaInstances?.find(
        (instance) => instance.ecotaxa_instance_id === project?.ecotaxa_instance_id,
    )?.ecotaxa_instance_url;

    const ecoTaxaSampleId = sample.ecotaxa_sample_imported === false ? null : sample.ecotaxa_sample_id;
    const ecoTaxaSampleUrl = buildEcoTaxaSampleUrl(ecoTaxaInstanceUrl, project?.ecotaxa_project_id, ecoTaxaSampleId);

    const ctdImportTaskId = sample.ctd_import_task_id ?? null;
    const ctdImportTaskPath = ctdImportTaskId != null && project
        ? `/projects/${project.project_id}/tasks/${ctdImportTaskId}`
        : null;

    return (
        <SectionCard sx={{ p: 0 }}>
            <Typography variant="h6" sx={{ px: { xs: 2.5, md: 3 }, py: 2 }}>Context</Typography>
            <Divider />

            <Box sx={{ p: { xs: 2.5, md: 3 }, display: "flex", flexDirection: "column", gap: 4 }}>
                {/* GENERAL */}
                <Box>
                    <SubsectionHeader title="General" />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="EcoPart project ID" value={project?.project_id} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="EcoPart project name" value={project?.project_title} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="File name" value={sample.filename} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="Project acronym" value={project?.project_acronym} />
                        </Grid>
                    </Grid>
                </Box>

                {/* ECOTAXA */}
                <Box>
                    <SubsectionHeader
                        title="EcoTaxa"
                        action={
                            <Tooltip title={ecoTaxaSampleUrl ? "" : "This sample is not imported in a linked EcoTaxa project"}>
                                <span>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        href={ecoTaxaSampleUrl ?? ""}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        disabled={!ecoTaxaSampleUrl}
                                    >
                                        Open sample in EcoTaxa
                                    </Button>
                                </span>
                            </Tooltip>
                        }
                    />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="EcoTaxa project ID" value={project?.ecotaxa_project_id} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="EcoTaxa project name" value={project?.ecotaxa_project_name} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="EcoTaxa sample ID" value={ecoTaxaSampleId} />
                        </Grid>
                    </Grid>
                </Box>

                {/* CTD */}
                <Box>
                    <SubsectionHeader
                        title="CTD"
                        action={
                            <Tooltip title={ctdImportTaskPath ? "" : "The import task of this CTD file is not available"}>
                                <span>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => ctdImportTaskPath && navigate(ctdImportTaskPath)}
                                        disabled={!ctdImportTaskPath}
                                    >
                                        Open import task
                                    </Button>
                                </span>
                            </Tooltip>
                        }
                    />
                    {sample.ctd_imported ? (
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <ReadOnlyField label="Original file name" value={sample.ctd_original_file_name} />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }} />
                            <Grid size={{ xs: 12, md: 6 }}>
                                <ReadOnlyField label="Imported file name" value={sample.ctd_imported_file_name} />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <ReadOnlyField label="Import date" value={formatUtcDateTime(sample.ctd_import_utc_date_time)} />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <ReadOnlyField label="Importator name" value={sample.ctd_importator_name} />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <ReadOnlyField label="Importator email" value={sample.ctd_importator_email} />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <ReadOnlyField label="Imported CTD description" value={sample.ctd_description} multiline />
                            </Grid>
                        </Grid>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            No CTD file is linked to this sample.
                        </Typography>
                    )}
                </Box>
            </Box>
        </SectionCard>
    );
}
