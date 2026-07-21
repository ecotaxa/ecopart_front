import { Box, Typography } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";

import type { LabelCount } from "../api/adminStats.api";
import { prettifyLabel } from "../utils/prettifyLabel";
import { chartColorAt } from "../utils/chartColors";

interface BreakdownChartProps {
    title: string;
    data: LabelCount[];
    variant?: "bar" | "pie";
    height?: number;
}

/**
 * Categorical breakdown (e.g. projects by instrument, tasks by status) rendered
 * as a vertical bar chart or a pie. Labels are prettified for display; slice
 * colours come from the shared brand palette. Bar category labels are angled
 * (like EvolutionChart) so MUI's overlap-avoidance keeps them visible instead
 * of dropping wide upright labels.
 */
export default function BreakdownChart({ title, data, variant = "bar", height = 260 }: BreakdownChartProps) {
    const rows = data.map((d, i) => ({
        id: d.label,
        label: prettifyLabel(d.label),
        value: d.count,
        color: chartColorAt(i),
    }));

    const hasData = rows.some((r) => r.value > 0);

    return (
        <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, minHeight: 20 }}>
                {title}
            </Typography>
            {!hasData ? (
                <Box
                    sx={{
                        border: "1px dashed",
                        borderColor: "divider",
                        borderRadius: 1,
                        height,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        No data
                    </Typography>
                </Box>
            ) : variant === "pie" ? (
                <PieChart
                    height={height}
                    aria-label={title}
                    series={[
                        {
                            data: rows,
                            innerRadius: 40,
                            paddingAngle: 1,
                            cornerRadius: 3,
                        },
                    ]}
                />
            ) : (
                <BarChart
                    height={height}
                    aria-label={title}
                    xAxis={[
                        {
                            scaleType: "band",
                            data: rows.map((r) => r.label),
                            // Angle the category labels + reserve height so wide
                            // labels (e.g. "Import eco taxa", organisation names)
                            // aren't dropped by MUI's overlap-avoidance.
                            tickLabelStyle: { angle: 45, textAnchor: "start", fontSize: 11 },
                            height: 90,
                        },
                    ]}
                    series={[
                        {
                            data: rows.map((r) => r.value),
                            color: chartColorAt(0),
                        },
                    ]}
                    grid={{ horizontal: true }}
                />
            )}
        </Box>
    );
}
