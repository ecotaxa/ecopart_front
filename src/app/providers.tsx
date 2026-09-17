import type { ReactNode } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClientProvider } from "@tanstack/react-query";

import { theme } from "@/theme";
import { queryClient } from "@/shared/api/queryClient";
import ConfirmDialogHost from "@/shared/components/ConfirmDialog";
import AuthBootstrap from "./AuthBootstrap";


export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <AuthBootstrap />
                {children}
                {/* App-wide confirmation dialog, driven by `confirmDialog()` from anywhere. */}
                <ConfirmDialogHost />
            </ThemeProvider>
        </QueryClientProvider>
    );
}
