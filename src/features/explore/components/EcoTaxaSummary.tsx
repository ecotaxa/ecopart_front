import { Fragment } from "react";
import { Alert, Box, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import DraftsIcon from "@mui/icons-material/Drafts";

import type { ClassificationShares, ExploreSummary } from "../types/explore.types";

const STATES: { key: keyof ClassificationShares; label: string; partial: boolean; color: "success" | "primary" }[] = [
    { key: "fully_validated", label: "Samples fully validated", partial: false, color: "success" },
    { key: "fully_predicted", label: "Samples fully predicted", partial: false, color: "primary" },
    { key: "partially_validated", label: "Samples partially validated", partial: true, color: "success" },
    { key: "partially_predicted", label: "Samples partially predicted", partial: true, color: "primary" },
];

function ShareRing({ value, color }: { value: number | undefined; color: "success" | "primary" }) {
    return (
        <Box sx={{ position: "relative", display: "inline-flex" }}>
            <CircularProgress variant="determinate" value={value ?? 0} color={color} size={40} thickness={3} />
            <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography variant="caption" sx={{ fontSize: 10 }}>{value == null ? "—" : `${Math.round(value)}%`}</Typography>
            </Box>
        </Box>
    );
}

/** EcoTaxa categories used by the selection and the share of samples per classification state. */
export default function EcoTaxaSummary({ summary }: { summary: ExploreSummary | null }) {
    const categories = summary?.ecotaxa_categories ?? [];
    const pending = summary?.ecotaxa_pending ?? 0;

    return (
        <Stack spacing={4}>
            <Box>
                <Typography variant="subtitle1">EcoTaxa classification</Typography>
                {summary?.ecotaxa_partial && (
                    <Alert severity="info" variant="outlined" role="status" sx={{ my: 1, py: 0 }}>
                        EcoTaxa statistics are being read for {pending} sample{pending === 1 ? "" : "s"}, the figures
                        below cover the others and will complete shortly.
                    </Alert>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Categories used (validated and predicted)
                </Typography>
                {categories.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">—</Typography>
                ) : (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {categories.map((category) => <Chip key={category} size="small" label={category} />)}
                    </Box>
                )}
            </Box>

            <Box>
                <Typography variant="subtitle1" sx={{ mb: 1.5 }}>Classification state</Typography>
                {/* Icon, label and share per state, two states a row: each share sits right after
                    the labels of its column instead of at the far end of it. */}
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "auto auto 1fr", sm: "auto auto 1fr auto auto 1fr" },
                        columnGap: 1.5,
                        rowGap: 2,
                        alignItems: "center",
                    }}
                >
                    {STATES.map((state) => (
                        <Fragment key={state.key}>
                            {state.partial
                                ? <DraftsIcon color={state.color} />
                                : <FolderIcon color={state.color} />}
                            <Typography variant="body2" sx={{ textTransform: "uppercase" }}>{state.label}</Typography>
                            <Box sx={{ justifySelf: "start" }}>
                                <ShareRing value={summary?.classification[state.key]} color={state.color} />
                            </Box>
                        </Fragment>
                    ))}
                </Box>
            </Box>
        </Stack>
    );
}
