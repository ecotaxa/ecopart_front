import React, { useEffect, useRef } from "react";
import { Autocomplete, Box, CircularProgress, TextField, Typography, createFilterOptions } from "@mui/material";

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

/**
 * Picks the EcoTaxa project to link among the ones the chosen EcoTaxa account can manage
 * (asked to EcoTaxa through the backend). Projects already linked to an EcoPart project are
 * shown but cannot be picked. If the list cannot be loaded, the ID can still be typed.
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

    // A project picked for another account or instrument is not in the new list: drop it,
    // so the form does not keep an ID the picker no longer shows.
    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    });
    useEffect(() => {
        if (projects && value && !projects.some((project) => project.ecotaxa_project_id.toString() === value)) {
            onChangeRef.current("");
        }
    }, [projects, value]);

    if (listUnavailable) {
        return (
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
        );
    }

    return (
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
    );
};
