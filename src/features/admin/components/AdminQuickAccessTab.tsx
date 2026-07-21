import {
    Box, Typography, Button, TextField, MenuItem,
    Alert, Stack, Paper, Skeleton, Link,
} from "@mui/material";

import ViewModuleIcon from "@mui/icons-material/ViewModule";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import { useNavigate } from "react-router-dom";

import { QUICK_ACCESS_PERIODS, useAdminQuickAccess } from "../hooks/useAdminQuickAccess";
import AdminStatisticsSection from "./AdminStatisticsSection";

// Vivid, distinct accent colours for the four counters (from the admin mockup).
const STAT_COLORS = {
    projects: "#4c7df0",
    users: "#9b51c7",
    exports: "#e15563",
    tasks: "#45a06a",
} as const;

// The mockup renders the admin shortcuts and the useful links in a plain blue
// (not the app's teal primary), so we set it explicitly here.
const ACTION_BLUE = "#1976d2";

/** One coloured headline counter (projects / users / exports / tasks). */
interface StatCardProps {
    label: string;
    value: number | null;
    loading: boolean;
    color: string;
    icon: React.ReactNode;
}

const StatCard = ({ label, value, loading, color, icon }: StatCardProps) => (
    <Paper
        elevation={0}
        sx={{
            backgroundColor: color,
            color: "common.white",
            borderRadius: 3,
            p: 2.5,
            width: 150,
            height: 150,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
        }}
    >
        <Box sx={{ "& svg": { fontSize: 30 } }}>{icon}</Box>
        <Box>
            {loading ? (
                <Skeleton variant="text" width={70} height={44} sx={{ bgcolor: "rgba(255,255,255,0.35)" }} />
            ) : (
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                    {value ?? "—"}
                </Typography>
            )}
            <Typography variant="h6" component="div" sx={{ fontWeight: 400, mt: 0.5 }}>
                {label}
            </Typography>
        </Box>
    </Paper>
);

/** An external "useful link" from the mockup (opens in a new tab). */
const USEFUL_LINKS: { label: string; href: string }[] = [
    { label: "Docker administration", href: "https://hub.docker.com/r/ecotaxa/ecopart_front" },
    { label: "Specifications", href: "https://github.com/ecotaxa/ecopart_front#readme" },
    { label: "Github repository", href: "https://github.com/ecotaxa/ecopart_front" },
];

/**
 * AdminQuickAccessTab — the "QUICK ACCESS" panel of the EcoPart administration page.
 *
 * Shows the four headline counters (projects, users, exports, tasks) scoped to a
 * selectable time window (`useAdminQuickAccess`), plus the admin shortcuts and the
 * useful external links from the mockup.
 */
export default function AdminQuickAccessTab() {
    const navigate = useNavigate();
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

            <Paper variant="outlined" sx={{ width: "100%", overflow: "hidden" }}>
                {/* CARD HEADER */}
                <Box sx={{ p: 3, borderBottom: "1px solid #e0e0e0" }}>
                    <Typography variant="h6">Quick access</Typography>
                </Box>

                <Box sx={{ p: 4 }}>
                    {/* PERIOD SELECTOR */}
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
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
                    <Stack
                        direction="row"
                        spacing={2.5}
                        sx={{ flexWrap: "wrap", gap: 2.5, mb: 5, justifyContent: "center" }}
                    >
                        <StatCard label="Projects" value={stats.projects} loading={loading} color={STAT_COLORS.projects} icon={<ViewModuleIcon />} />
                        <StatCard label="Users" value={stats.users} loading={loading} color={STAT_COLORS.users} icon={<PeopleAltIcon />} />
                        <StatCard label="Exports" value={stats.exports} loading={loading} color={STAT_COLORS.exports} icon={<CloudUploadIcon />} />
                        <StatCard label="Tasks" value={stats.tasks} loading={loading} color={STAT_COLORS.tasks} icon={<ListAltIcon />} />
                    </Stack>

                    {/* ADMIN SHORTCUTS */}
                    <Stack spacing={1.5} sx={{ alignItems: "flex-start", mb: 4 }}>
                        <Button
                            variant="outlined"
                            endIcon={<ArrowForwardIcon />}
                            onClick={() => navigate("/admin/projects")}
                            sx={{
                                color: ACTION_BLUE,
                                borderColor: ACTION_BLUE,
                                "&:hover": { borderColor: ACTION_BLUE, backgroundColor: "rgba(25,118,210,0.04)" },
                            }}
                        >
                            See all <Box component="span" sx={{ fontWeight: 700 }}>projects</Box> as administrator
                        </Button>
                        <Button
                            variant="outlined"
                            endIcon={<ArrowForwardIcon />}
                            onClick={() => navigate("/admin/tasks")}
                            sx={{
                                color: ACTION_BLUE,
                                borderColor: ACTION_BLUE,
                                "&:hover": { borderColor: ACTION_BLUE, backgroundColor: "rgba(25,118,210,0.04)" },
                            }}
                        >
                            See all <Box component="span" sx={{ fontWeight: 700 }}>tasks</Box> as administrator
                        </Button>
                    </Stack>

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
                                    sx={{ color: ACTION_BLUE }}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </Stack>
                    </Box>
                </Box>
            </Paper>

            {/* Full /admin/stats analytics dashboard, below the headline counters. */}
            <AdminStatisticsSection />
        </Box>
    );
}
