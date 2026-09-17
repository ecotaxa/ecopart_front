import React from "react";
import {
    Alert, AlertTitle, Box, Button, CircularProgress,
    Dialog, DialogActions, DialogContent, DialogTitle, Typography,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";

import { createEcopartTheme, ecotaxaColors } from "@/theme";
import type { SampleQcGraphs } from "../api/projects.api";
import { QcSampleCard } from "./QcSampleCard";

/**
 * The QC modal is a dense read-at-a-glance screen (four graphs plus their metadata per sample), so
 * all of its text runs 20% larger than the rest of the app. Built once at module level rather than
 * per render, and applied to the whole dialog — including the charts, whose axis and tick labels
 * come from the theme's `body1`/`caption`.
 */
const qcModalTheme = createEcopartTheme(1.2);

/**
 * Slack (px) left between the scroll position and the bottom of the QC dialog for the review to
 * count as complete — sub-pixel rounding and the last card's margin would otherwise make the exact
 * bottom unreachable.
 */
const QC_SCROLL_BOTTOM_TOLERANCE_PX = 24;

interface QcReviewDialogProps {
    open: boolean;
    onClose: () => void;
    /** The names that will actually be imported (drives the subtitle count). */
    sampleNames: string[];
    /** One graph dataset per importable sample. */
    previews: SampleQcGraphs[];
    /** Names the preview endpoint rejected: shown first, with a REMOVE button, and they block the import. */
    notImportable: string[];
    loading: boolean;
    error: string | null;
    isImporting: boolean;
    onRemoveSample: (sampleName: string) => void;
    /** IMPORT & VALIDATE: import and mark every remaining sample VALIDATED. */
    onImportValidated: () => void;
    /** IMPORT & PENDING: import and leave them PENDING. */
    onImportPending: () => void;
}

/**
 * Pre-import visual quality control: the QC graphs of every sample about to be
 * imported, reviewed before the import is committed as validated or pending.
 *
 * It is a *review* screen: the import actions stay locked until the operator
 * has scrolled through every graph, i.e. reached the bottom of the scrollable
 * content. The latch is one-way — once the bottom has been seen, scrolling back
 * up (or removing a sample, which makes the content scrollable again) must not
 * re-lock the buttons — and is reset when the dialog opens or while the preview
 * is (re)loading, so a new set of samples is reviewed afresh.
 */
export const QcReviewDialog: React.FC<QcReviewDialogProps> = ({
    open,
    onClose,
    sampleNames,
    previews,
    notImportable,
    loading,
    error,
    isImporting,
    onRemoveSample,
    onImportValidated,
    onImportPending,
}) => {
    const scrollRef = React.useRef<HTMLDivElement | null>(null);
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const [fullyReviewed, setFullyReviewed] = React.useState(false);

    const updateScrollState = React.useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        // Content that fits without a scrollbar satisfies this immediately: there is nothing left to
        // scroll to, so nothing left to review.
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= QC_SCROLL_BOTTOM_TOLERANCE_PX;
        if (atBottom) setFullyReviewed(true);
    }, []);

    React.useEffect(() => {
        if (!open || loading) {
            setFullyReviewed(false);
            return;
        }
        // The charts mount asynchronously (MUI X measures its container first), so the content keeps
        // growing after this effect runs: watch it and re-evaluate instead of measuring only once.
        updateScrollState();
        const content = contentRef.current;
        if (!content || typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(updateScrollState);
        observer.observe(content);
        return () => observer.disconnect();
    }, [open, loading, previews, notImportable, updateScrollState]);

    // Import is blocked while the preview is loading, nothing is selected, an import is in flight,
    // any sample in the working set is not importable (it would fail the whole backend import), or
    // the graphs have not been scrolled through yet.
    const importActionsDisabled =
        loading || sampleNames.length === 0 || isImporting || notImportable.length > 0 || !fullyReviewed;

    return (
        <ThemeProvider theme={qcModalTheme}>
            <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth scroll="paper">
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* component="span": DialogTitle renders an <h2>, so a nested heading (variant="h5"
                        defaults to <h5>) would be invalid HTML. */}
                    <Typography component="span" variant="h5" fontWeight="bold">Visual quality control and import</Typography>
                </DialogTitle>
                <DialogContent
                    dividers
                    ref={scrollRef}
                    onScroll={updateScrollState}
                    sx={{ backgroundColor: 'grey.50' }}
                >
                    {/* Wrapper measured by the ResizeObserver above: its height is what grows as the
                        charts mount, and what decides whether the dialog is scrollable at all. */}
                    <Box ref={contentRef}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Please review the graphs of every sample below, then import them as validated. If the image
                            selection or the descending filter does not look right, cancel this import, go back to
                            Zooprocess or UVPapp to run the procedure again, and import the samples afterwards.
                        </Typography>

                        <Typography variant="body1" sx={{ mb: 4 }}>
                            You are about to import <strong>{sampleNames.length}</strong> {sampleNames.length === 1 ? "sample" : "samples"} : <strong>{sampleNames.join(", ")}</strong>
                        </Typography>

                        {error && (
                            <Alert severity="warning" sx={{ mb: 3 }}>
                                <AlertTitle>QC graphs unavailable</AlertTitle>
                                {error}
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    {sampleNames.length === 1 ? "This sample" : "These samples"} can still be
                                    imported, but without the visual quality control — import{' '}
                                    {sampleNames.length === 1 ? "it" : "them"} as pending if you want to review{' '}
                                    {sampleNames.length === 1 ? "it" : "them"} later.
                                </Typography>
                            </Alert>
                        )}

                        {loading ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
                                <CircularProgress />
                                <Typography variant="body2" color="text.secondary">Computing QC graphs…</Typography>
                            </Box>
                        ) : (
                            <>
                                {/* Samples the preview endpoint rejected as not importable: no QC graphs, but
                                    shown FIRST (they block the import) with a red border and a REMOVE button so
                                    the operator can spot and drop them without scrolling past the chart cards. */}
                                {notImportable.map((name) => (
                                    <Box key={name} sx={{ backgroundColor: ecotaxaColors.danger[50], p: 3, borderRadius: 1, border: '2px solid', borderColor: 'error.main', mb: 3 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                            <Typography variant="subtitle2" fontWeight="bold" color="error.main">Sample : {name}</Typography>
                                            <Button
                                                onClick={() => onRemoveSample(name)}
                                                disabled={isImporting}
                                                color="error"
                                                sx={{ fontWeight: 'bold' }}
                                                size="small"
                                            >
                                                REMOVE FROM IMPORT
                                            </Button>
                                        </Box>
                                        <Alert severity="error">
                                            This sample is not importable, so no QC preview could be generated. Remove it from the import to continue.
                                        </Alert>
                                    </Box>
                                ))}

                                {previews.map((sample) => (
                                    <QcSampleCard
                                        key={sample.sample_name}
                                        sample={sample}
                                        onRemove={onRemoveSample}
                                        removeDisabled={isImporting}
                                    />
                                ))}
                            </>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    {notImportable.length > 0 ? (
                        <Typography variant="caption" color="error" sx={{ mr: 'auto' }}>
                            Remove the non-importable sample{notImportable.length > 1 ? 's' : ''} to continue.
                        </Typography>
                    ) : !fullyReviewed && !loading && (
                        // Explains the disabled import buttons: without it the operator has no way to
                        // know the review gate exists.
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
                            Scroll down through every graph to enable the import.
                        </Typography>
                    )}
                    <Button
                        onClick={onImportValidated}
                        disabled={importActionsDisabled}
                        variant="text"
                        color="success"
                        sx={{ fontWeight: 'bold' }}
                    >
                        IMPORT &amp; VALIDATE
                    </Button>
                    <Button
                        onClick={onImportPending}
                        disabled={importActionsDisabled}
                        variant="text"
                        color="info"
                        sx={{ fontWeight: 'bold' }}
                    >
                        IMPORT &amp; PENDING
                    </Button>
                    <Button onClick={onClose} color="error" sx={{ fontWeight: 'bold' }}>
                        CANCEL IMPORT
                    </Button>
                </DialogActions>
            </Dialog>
        </ThemeProvider>
    );
};
