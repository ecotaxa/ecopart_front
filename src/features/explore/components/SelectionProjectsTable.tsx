import { useMemo, useState } from "react";
import { Box, Chip, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import FilterListIcon from "@mui/icons-material/FilterList";

import { useAuthStore } from "@/features/auth";
import { buildPageSizeOptions } from "@/shared/utils/pageSizeOptions";
import type { ExploreMode, ExploreProjectRow } from "../types/explore.types";
import { buildAccessRequestMailto } from "../utils/accessRequestMail";
import PrivacyStatusInfo from "@/shared/components/PrivacyStatusInfo";
import { PRIVACY_LABELS } from "../utils/exploreFilters";

type SearchAttribute = "project_title" | "instrument_model" | "ecotaxa_project_name" | "contact";

const SEARCH_ATTRIBUTES: { value: SearchAttribute; label: string }[] = [
    { value: "project_title", label: "Title" },
    { value: "instrument_model", label: "Instrument" },
    { value: "ecotaxa_project_name", label: "EcoTaxa project" },
    { value: "contact", label: "Contact" },
];

const searchableText = (row: ExploreProjectRow, attribute: SearchAttribute): string => {
    if (attribute === "contact") return row.contact ? `${row.contact.user_name} ${row.contact.email}` : "";
    return `${row[attribute] ?? ""}${attribute === "project_title" ? ` ${row.project_id}` : ""}`;
};

interface SelectionProjectsTableProps {
    title: string;
    subtitle: string;
    rows: ExploreProjectRow[];
    mode: ExploreMode;
}

/**
 * Projects holding at least one sample of the selection. The contact chip opens
 * the user's mail client with a pre-written data request to the project managers.
 */
export default function SelectionProjectsTable({ title, subtitle, rows, mode }: SelectionProjectsTableProps) {
    const user = useAuthStore((s) => s.user);
    const [searchText, setSearchText] = useState("");
    const [searchAttribute, setSearchAttribute] = useState<SearchAttribute>("project_title");

    const visibleRows = useMemo(() => {
        const text = searchText.trim().toLowerCase();
        if (!text) return rows;
        return rows.filter((row) => searchableText(row, searchAttribute).toLowerCase().includes(text));
    }, [rows, searchText, searchAttribute]);

    const columns: GridColDef<ExploreProjectRow>[] = [
        {
            field: "project_title",
            headerName: "Title [ID]",
            flex: 1.5,
            minWidth: 200,
            valueGetter: (_value, row) => `${row.project_title} [${row.project_id}]`,
        },
        { field: "instrument_model", headerName: "Instrument", width: 110 },
        {
            field: "ecotaxa_project_name",
            headerName: "EcoTaxa project",
            flex: 1.2,
            minWidth: 160,
            valueGetter: (value) => value ?? "—",
        },
        {
            field: "nb_selected_samples",
            headerName: "Selected / total samples",
            width: 120,
            align: "center",
            headerAlign: "center",
            valueGetter: (_value, row) => `${row.nb_selected_samples}/${row.nb_samples}`,
        },
        {
            field: "privacy_status",
            headerName: "Privacy status",
            width: 150,
            renderHeader: () => (
                <Box component="span" sx={{ fontWeight: 500 }}>
                    Privacy status
                    <PrivacyStatusInfo />
                </Box>
            ),
            renderCell: ({ row }) => (
                <Box sx={{ lineHeight: 1.2, py: 1 }}>
                    <Typography variant="body2">{PRIVACY_LABELS[row.privacy_status]}</Typography>
                    {row.is_my_project && (
                        <Typography variant="caption" color="text.secondary">My project</Typography>
                    )}
                </Box>
            ),
        },
        {
            field: "contact",
            headerName: "Contact",
            width: 190,
            sortable: false,
            renderCell: ({ row }) => {
                const href = buildAccessRequestMailto(row, mode, user);
                const name = row.contact?.user_name ?? row.managers[0]?.user_name ?? "—";
                if (!href) return <Typography variant="body2" color="text.secondary">{name}</Typography>;
                return (
                    <Tooltip title="Ask the project managers for the data">
                        <Chip
                            component="a"
                            href={href}
                            clickable
                            size="small"
                            icon={<MailOutlineIcon />}
                            label={name}
                        />
                    </Tooltip>
                );
            },
        },
    ];

    return (
        <Box>
            <Typography variant="h6" component="h3">{title} ({rows.length})</Typography>
            <Typography variant="body2" color="text.secondary">{subtitle}</Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ my: 2, alignItems: { sm: "center" } }}>
                <TextField
                    size="small"
                    label="Search"
                    placeholder="Name, email, etc..."
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    sx={{ width: { sm: 280 } }}
                />
                <TextField
                    select
                    size="small"
                    label="Attribute"
                    value={searchAttribute}
                    onChange={(event) => setSearchAttribute(event.target.value as SearchAttribute)}
                    sx={{ width: { sm: 200 } }}
                >
                    {SEARCH_ATTRIBUTES.map((attribute) => (
                        <MenuItem key={attribute.value} value={attribute.value}>{attribute.label}</MenuItem>
                    ))}
                </TextField>
                <Tooltip title="Advanced filters (coming soon)">
                    <span>
                        <IconButton disabled aria-label="Advanced filters">
                            <FilterListIcon />
                        </IconButton>
                    </span>
                </Tooltip>
            </Stack>

            <DataGrid
                rows={visibleRows}
                columns={columns}
                getRowId={(row) => row.project_id}
                getRowHeight={() => "auto"}
                initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                pageSizeOptions={buildPageSizeOptions()}
                disableRowSelectionOnClick
                localeText={{ noRowsLabel: "No project in the selection" }}
                sx={{ minHeight: 200 }}
            />
        </Box>
    );
}
