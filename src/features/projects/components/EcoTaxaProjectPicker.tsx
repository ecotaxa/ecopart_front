import React, { useEffect, useRef, useState } from "react";
import { Alert, Autocomplete, Box, CircularProgress, TextField, Typography, createFilterOptions } from "@mui/material";

import type { EcoTaxaAccountProject } from "@/shared/api/ecotaxa.api";
import { ApiError } from "@/shared/api/http";
import { useEcoTaxaAccountProjects } from "@/shared/api/referenceData.hooks";

interface EcoTaxaProjectPickerProps {
    userId: number | null | undefined;
    /** EcoTaxa account picked above ("" while none): the list is the projects it can manage. */
    accountId: string;
    /** EcoPart instrument model: only the EcoTaxa projects of the matching instrument are listed. */
    instrumentModel: string;
    /** Picked EcoTaxa project ID ("" while none). */
    value: string;
    onChange: (projectId: string) => void;
    error?: string;
}

const projectLabel = (project: EcoTaxaAccountProject) =>
    `${project.ecotaxa_project_title} (#${project.ecotaxa_project_id})`;

// Typing filters on the title and on the ID.
const filterProjects = createFilterOptions<EcoTaxaAccountProject>({
    stringify: (project) => `${project.ecotaxa_project_title} ${project.ecotaxa_project_id}`,
});

const projectDetails = (project: EcoTaxaAccountProject) =>
    [
        `#${project.ecotaxa_project_id}`,
        project.ecotaxa_project_instrument,
        project.ecotaxa_project_object_count != null && `${project.ecotaxa_project_object_count.toLocaleString("en-US")} objects`,
        project.ecotaxa_project_validated_pct != null && `${Math.round(project.ecotaxa_project_validated_pct)}% validated`,
    ].filter(Boolean).join(" · ");

/** A project shown as picked, with the instrument model the list was asked for at that time. */
interface PickedProject {
    project: EcoTaxaAccountProject;
    instrumentModel: string;
}

// Why a picked project left the list: its EcoTaxa instrument when the instrument model changed
// since it was picked, otherwise the account no longer offers it (rights changed in EcoTaxa).
const droppedProjectMessage = (projectId: string, picked: PickedProject | null, instrumentModel: string): string => {
    const label = picked ? `"${projectLabel(picked.project)}"` : `EcoTaxa project #${projectId}`;
    if (picked && instrumentModel && picked.instrumentModel !== instrumentModel) {
        const instrument = picked.project.ecotaxa_project_instrument;
        return `${label} was unselected: ${instrument ? `it is a ${instrument} EcoTaxa project` : "it has no instrument in EcoTaxa"}, `
            + `which does not fit the instrument model ${instrumentModel}. Pick an EcoTaxa project that fits it.`;
    }
    return `${label} was unselected: it is not among the ${instrumentModel ? `${instrumentModel}-compatible ` : ""}`
        + "EcoTaxa projects this account can manage.";
};

/**
 * Picks the EcoTaxa project to link among the ones the chosen EcoTaxa account can manage
 * (asked to EcoTaxa through the backend). Projects already linked to an EcoPart project are
 * shown but cannot be picked. If the list cannot be loaded, the ID can still be typed.
 * A picked project the new list no longer offers is unselected, with a warning saying why.
 */
export const EcoTaxaProjectPicker: React.FC<EcoTaxaProjectPickerProps> = ({
    userId,
    accountId,
    instrumentModel,
    value,
    onChange,
    error,
}) => {
    const accountNumber = accountId ? Number(accountId) : null;
    const { data: projects, isFetching, error: loadError } = useEcoTaxaAccountProjects(userId, accountNumber, instrumentModel);

    const sessionExpired = loadError instanceof ApiError && loadError.status === 409;
    const listUnavailable = loadError != null && !sessionExpired;
    const options = projects ?? [];
    const selected = options.find((project) => project.ecotaxa_project_id.toString() === value) ?? null;

    // A project picked for another instrument is not in the new list: drop it, so the form does
    // not keep an ID the picker no longer shows, and say why under the field (the account and
    // instance selects clear the project themselves).
    // Both states are adjusted while rendering (React's "storing information from previous renders"),
    // the effect only tells the parent.
    const isDropped = projects !== undefined && value !== "" && !projects.some((project) => project.ecotaxa_project_id.toString() === value);
    const [lastPicked, setLastPicked] = useState<PickedProject | null>(null);
    if (selected && (lastPicked?.project !== selected || lastPicked.instrumentModel !== instrumentModel)) {
        setLastPicked({ project: selected, instrumentModel });
    }
    const [dropped, setDropped] = useState<{ key: string; accountId: string; message: string } | null>(null);
    const dropKey = `${accountId}|${instrumentModel}|${value}`;
    if (isDropped && dropped?.key !== dropKey) {
        const picked = lastPicked?.project.ecotaxa_project_id.toString() === value ? lastPicked : null;
        setDropped({ key: dropKey, accountId, message: droppedProjectMessage(value, picked, instrumentModel) });
    }
    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    });
    useEffect(() => {
        if (isDropped) onChangeRef.current("");
    }, [isDropped]);
    // Shown until another project is picked, the account changes, or the user closes it.
    const droppedWarning = dropped && dropped.accountId === accountId && !value ? (
        <Alert severity="warning" onClose={() => setDropped(null)} sx={{ mt: 1 }}>
            {dropped.message}
        </Alert>
    ) : null;

    if (listUnavailable) {
        return (
            <Box>
                <TextField
                    fullWidth
                    label="EcoTaxa project ID"
                    placeholder="Enter existing EcoTaxa project ID (e.g. 16188)"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    size="small"
                    error={Boolean(error)}
                    helperText={error ?? "The list of your EcoTaxa projects could not be loaded: enter the project ID."}
                />
                {droppedWarning}
            </Box>
        );
    }

    return (
        <Box>
            <Autocomplete
                fullWidth
                size="small"
                options={options}
                value={selected}
                onChange={(_, project) => onChange(project ? project.ecotaxa_project_id.toString() : "")}
                getOptionLabel={projectLabel}
                isOptionEqualToValue={(option, picked) => option.ecotaxa_project_id === picked.ecotaxa_project_id}
                getOptionDisabled={(project) => project.already_linked}
                filterOptions={filterProjects}
                disabled={!accountId}
                loading={isFetching}
                noOptionsText={
                    instrumentModel
                        ? `This EcoTaxa account manages no ${instrumentModel}-compatible EcoTaxa project.`
                        : "This EcoTaxa account manages no EcoTaxa project."
                }
                renderOption={({ key, ...props }, project) => (
                    <li key={key} {...props}>
                        <Box sx={{ lineHeight: 1.3 }}>
                            <Typography variant="body2">{project.ecotaxa_project_title}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {projectDetails(project)}
                                {project.already_linked && " · already linked to an EcoPart project"}
                            </Typography>
                        </Box>
                    </li>
                )}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="EcoTaxa project"
                        placeholder="Search by title or ID"
                        error={Boolean(error) || sessionExpired}
                        helperText={
                            error
                            ?? (sessionExpired
                                ? "Your session on this EcoTaxa account has expired: log in to it again (ADD AN ECOTAXA ACCOUNT)."
                                : "EcoTaxa projects this account can manage.")
                        }
                        slotProps={{
                            input: {
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {isFetching ? <CircularProgress size={18} /> : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                            },
                        }}
                    />
                )}
            />
            {droppedWarning}
        </Box>
    );
};
