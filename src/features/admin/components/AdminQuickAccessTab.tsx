import {
    Box, Typography, TextField, MenuItem,
    Alert, Stack, Link, Divider,
} from "@mui/material";
import Grid from "@mui/material/Grid";

import ViewModuleIcon from "@mui/icons-material/ViewModule";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ListAltIcon from "@mui/icons-material/ListAlt";

import SectionCard from "@/shared/components/SectionCard";
import StatCard, { STAT_CARD_COLORS } from "@/shared/components/StatCard";
import { QUICK_ACCESS_PERIODS, useAdminQuickAccess } from "../hooks/useAdminQuickAccess";
import AdminStatisticsSection from "./AdminStatisticsSection";

// Headline-counter accents shared with the explore counters (StatCard).
const [PROJECTS_COLOR, USERS_COLOR, EXPORTS_COLOR, TASKS_COLOR] = STAT_CARD_COLORS;
const STAT_COLORS = {
    projects: PROJECTS_COLOR,
    users: USERS_COLOR,
    exports: EXPORTS_COLOR,
    tasks: TASKS_COLOR,
} as const;

/** An external "useful link" from the mockup (opens in a new tab). */
const USEFUL_LINKS: { label: string; href: string }[] = [
    { label: "Docker administration", href: "https://hub.docker.com/r/ecotaxa/ecopart_front" },
    { label: "Specifications", href: "https://github.com/ecotaxa/ecopart_front#readme" },
];

/**
 * AdminQuickAccessTab — the "QUICK ACCESS" panel of the EcoPart administration page.
 *
 * Shows the four headline counters (projects, users, exports, tasks) scoped to a
 * selectable time window (`useAdminQuickAccess`), plus the admin shortcuts and the
 * useful external links from the mockup.
 */
export default function AdminQuickAccessTab() {
    const { stats, loading, error, period, setPeriod } = useAdminQuickAccess();

    return (
        <Box>
            {error && (
                <Box sx={{ mb: 2 }}>
                    <Alert severity="error" variant="outlined">
                        {error}
                    </Alert>
                </Box>
            )}

            {/* One big container for the whole tab, matching the project tabs'
                single-SectionCard architecture. */}
            <SectionCard>
                {/* HEADER + PERIOD SELECTOR */}
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 2,
                        mb: 3,
                    }}
                >
                    <Typography variant="h6">Quick access</Typography>
                    <TextField
                        select
                        size="small"
                        label="Period"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as typeof period)}
                        sx={{ minWidth: 200 }}
                    >
                        {QUICK_ACCESS_PERIODS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </Box>

                {/* STAT CARDS */}
                <Grid container spacing={2.5} sx={{ mb: 5 }}>
                    <Grid size={{ xs: 6, md: 3 }}>
                        <StatCard label="Projects" value={stats.projects} loading={loading} color={STAT_COLORS.projects} icon={<ViewModuleIcon />} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                        <StatCard label="Users" value={stats.users} loading={loading} color={STAT_COLORS.users} icon={<PeopleAltIcon />} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                        <StatCard label="Exports" value={stats.exports} loading={loading} color={STAT_COLORS.exports} icon={<CloudUploadIcon />} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                        <StatCard label="Tasks" value={stats.tasks} loading={loading} color={STAT_COLORS.tasks} icon={<ListAltIcon />} />
                    </Grid>
                </Grid>

                {/* USEFUL LINKS */}
                <Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Useful links:
                    </Typography>
                    <Stack spacing={0.5} sx={{ alignItems: "flex-start" }}>
                        {USEFUL_LINKS.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                underline="hover"
                                color="primary"
                            >
                                {link.label}
                            </Link>
                        ))}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography component="span" variant="body2">
                                <span>GitHub repository </span>
                                <Link
                                    href="https://github.com/ecotaxa/ecopart_front"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    underline="hover"
                                    color="primary"
                                >
                                    <span>FRONT</span>
                                </Link>
                                <Typography component="span" variant="body2">
                                    <span> et </span>
                                </Typography>
                                <Link
                                    href="https://github.com/ecotaxa/ecopart_back"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    underline="hover"
                                    color="primary"
                                >
                                    <span>BACK</span>
                                </Link>
                            </Typography>

                        </Box>
                    </Stack>
                </Box>

                <Divider sx={{ my: 4 }} />

                {/* Full /admin/stats analytics dashboard, in the same container. */}
                <AdminStatisticsSection />
            </SectionCard>
        </Box>
    );
}
