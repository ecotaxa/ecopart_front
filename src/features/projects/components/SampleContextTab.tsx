import { useNavigate } from "react-router-dom";
import { Box, Button, Divider, Grid, Tooltip, Typography } from "@mui/material";

import SectionCard from "@/shared/components/SectionCard";
import { useEcoTaxaInstances } from "@/shared/api/referenceData.hooks";
import type { Project, SampleData } from "../api/projects.api";
import { buildEcoTaxaSampleUrl } from "../utils/ecotaxaLinks";
import { formatUtcDateTime } from "../utils/sampleFormat";
import { ReadOnlyField, SubsectionHeader } from "./SampleDetailFields";

interface SampleContextTabProps {
    project: Project | undefined;
    sample: SampleData;
}

export function SampleContextTab({ project, sample }: SampleContextTabProps) {
    const navigate = useNavigate();

    const { data: ecoTaxaInstances } = useEcoTaxaInstances();
    const ecoTaxaInstanceUrl = ecoTaxaInstances?.find(
        (instance) => instance.ecotaxa_instance_id === project?.ecotaxa_instance_id,
    )?.ecotaxa_instance_url;

    const ecoTaxaSampleId = sample.ecotaxa_sample_imported === false ? null : sample.ecotaxa_sample_id;
    const ecoTaxaSampleUrl = buildEcoTaxaSampleUrl(ecoTaxaInstanceUrl, project?.ecotaxa_project_id, ecoTaxaSampleId);

    const buildTaskPath = (taskId?: number | null) =>
        taskId != null && project ? `/projects/${project.project_id}/tasks/${taskId}` : null;
    const ecoTaxaImportTaskPath = buildTaskPath(sample.ecotaxa_sample_task_id);
    const ctdImportTaskPath = buildTaskPath(sample.ctd_import_task_id);

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
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="EcoPart sample ID" value={sample.sample_id} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField
                                label="Sample creation date"
                                value={formatUtcDateTime(sample.sample_creation_utc_date_time)}
                            />
                        </Grid>
                    </Grid>
                </Box>

                {/* ECOTAXA */}
                <Box>
                    <SubsectionHeader
                        title="EcoTaxa"
                        action={
                            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 1 }}>
                                <Tooltip title={ecoTaxaImportTaskPath ? "" : "The EcoTaxa import task of this sample is not available"}>
                                    <span>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            aria-label="Open EcoTaxa import task"
                                            onClick={() => ecoTaxaImportTaskPath && navigate(ecoTaxaImportTaskPath)}
                                            disabled={!ecoTaxaImportTaskPath}
                                        >
                                            Open import task
                                        </Button>
                                    </span>
                                </Tooltip>
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
                            </Box>
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
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="EcoTaxa import status" value={sample.ecotaxa_import_status_label} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField
                                label="EcoTaxa import date"
                                value={formatUtcDateTime(sample.ecotaxa_sample_import_utc_date_time)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="Number of images" value={sample.ecotaxa_sample_nb_images} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ReadOnlyField label="EcoTaxa import task ID" value={sample.ecotaxa_sample_task_id} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }} />
                        <Grid size={{ xs: 12 }}>
                            <ReadOnlyField label="TSV file name" value={sample.ecotaxa_sample_tsv_file_name} />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <ReadOnlyField label="TSV local folder path" value={sample.ecotaxa_sample_local_folder_tsv_path} />
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
                                        aria-label="Open CTD import task"
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
                            <Grid size={{ xs: 12, md: 6 }}>
                                <ReadOnlyField label="File extension" value={sample.ctd_file_extension} />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <ReadOnlyField label="Imported file name" value={sample.ctd_imported_file_name} />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <ReadOnlyField label="CTD station ID" value={sample.ctd_station_id} />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <ReadOnlyField label="Importator name" value={sample.ctd_importator_name} />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <ReadOnlyField label="Importator email" value={sample.ctd_importator_email} />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <ReadOnlyField label="Import date" value={formatUtcDateTime(sample.ctd_import_utc_date_time)} />
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
