import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { geoAzimuthalEquidistant, geoGraticule, geoMercator, geoPath, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { FeatureCollection } from "geojson";
import {
    Box, Fade, IconButton, Link, Paper, ToggleButton, ToggleButtonGroup, Tooltip, Typography, useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import CloseIcon from "@mui/icons-material/Close";

import { ecotaxaColors } from "@/theme";
import type { GeoBox, Hemisphere, MapPoint, MapProjection, MarkerShape, PolarMapProps } from "./types";

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 40;
const ZOOM_STEP = 1.6;
/** Arc (degrees) shown around a single point, or a tight group of points, when framing them. */
const MIN_FIT_SPAN_DEG = 40;
const FIT_PADDING = 40;
const MARKER_SIZE = 12;
/** The disc goes 20° past the equator: beyond, the far hemisphere gets too distorted to read. */
const CLIP_ANGLE = 110;
const FAR_LATITUDE_LIMIT = CLIP_ANGLE - 90;
/** Mercator stops where the world becomes a square (the poles are at infinity). */
const MERCATOR_LATITUDE_LIMIT = 85.05;

interface View {
    k: number;
    x: number;
    y: number;
}

const HOME_VIEW: View = { k: 1, x: 0, y: 0 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const isValidPoint = ({ latitude, longitude }: MapPoint) =>
    Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;

/** The point can be drawn on the map (on the disc of the given pole, in the polar view). */
const isOnMap = (point: MapPoint, kind: MapProjection, hemisphere: Hemisphere) => {
    if (kind === "mercator") return Math.abs(point.latitude) <= MERCATOR_LATITUDE_LIMIT;
    return hemisphere === "north" ? point.latitude >= -FAR_LATITUDE_LIMIT : point.latitude <= FAR_LATITUDE_LIMIT;
};

/** The pole most of the points are closest to. */
const preferredHemisphere = (points: MapPoint[]): Hemisphere =>
    points.filter((point) => point.latitude < 0).length > points.length / 2 ? "south" : "north";

/**
 * Azimuthal equidistant projection centred on a pole: true polar view, distances to
 * the pole are preserved and the parallels are evenly spaced circles. At zoom 1 the
 * edge of the disc sits on a circle of `radius` px around the origin.
 */
const polarProjection = (hemisphere: Hemisphere, radius: number): GeoProjection =>
    geoAzimuthalEquidistant()
        .rotate([0, hemisphere === "north" ? -90 : 90])
        .clipAngle(CLIP_ANGLE)
        .scale(radius / (CLIP_ANGLE * Math.PI / 180))
        .translate([0, 0])
        .precision(0.3);

/** Mercator (flat world map): at zoom 1 the world spans the map width, centred on the equator. */
const mercatorProjection = (width: number): GeoProjection =>
    geoMercator()
        .scale(Math.max(width, 1) / (2 * Math.PI))
        .translate([0, 0])
        .precision(0.3);

const buildProjection = (kind: MapProjection, hemisphere: Hemisphere, width: number, height: number) =>
    kind === "mercator"
        ? mercatorProjection(width)
        : polarProjection(hemisphere, Math.max(Math.min(width, height) / 2 - 8, 1));

/** The zoom and offset framing the points of the map (the whole map without any). */
function fitView(
    projection: GeoProjection, kind: MapProjection, hemisphere: Hemisphere, points: MapPoint[], width: number, height: number,
): View {
    const projected = points
        .filter((point) => isOnMap(point, kind, hemisphere))
        .map((point) => projection([point.longitude, point.latitude]))
        .filter((xy): xy is [number, number] => xy !== null);
    if (projected.length === 0) return HOME_VIEW;

    const xs = projected.map(([x]) => x);
    const ys = projected.map(([, y]) => y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const minSpan = (MIN_FIT_SPAN_DEG * Math.PI / 180) * projection.scale();
    // Never smaller than the whole map (zoom 1).
    const k = clamp(
        Math.min(
            (width - 2 * FIT_PADDING) / Math.max(maxX - minX, minSpan),
            (height - 2 * FIT_PADDING) / Math.max(maxY - minY, minSpan),
        ),
        1,
        MAX_ZOOM,
    );
    return { k, x: -k * (minX + maxX) / 2, y: -k * (minY + maxY) / 2 };
}

const markerPath = (shape: MarkerShape, size: number) => {
    const h = size / 2;
    if (shape === "triangle") return `M0,${-h}L${h},${h * 0.8}L${-h},${h * 0.8}Z`;
    if (shape === "square") return `M${-h * 0.85},${-h * 0.85}h${h * 1.7}v${h * 1.7}h${-h * 1.7}Z`;
    // A pin whose tip is the position: a disc above, a point below.
    if (shape === "pin") return `M0,0L${-h * 0.75},${-h * 1.3}A${h * 0.85},${h * 0.85} 0 1,1 ${h * 0.75},${-h * 1.3}Z`;
    // An X centred on the position, drawn as a thin outline.
    if (shape === "cross") {
        const t = h * 0.28;
        return `M${-h},${-h + t}L${-h + t},${-h}L0,${-t}L${h - t},${-h}L${h},${-h + t}L${t},0L${h},${h - t}L${h - t},${h}L0,${t}L${-h + t},${h}L${-h},${h - t}L${-t},0Z`;
    }
    return `M${h},0A${h},${h} 0 1,1 ${-h},0A${h},${h} 0 1,1 ${h},0Z`;
};

const formatLatitude = (latitude: number) => `${Math.abs(latitude)}°${latitude > 0 ? "N" : latitude < 0 ? "S" : ""}`;

/** Natural Earth land (1:50m), bundled: no tile server is involved. */
function useLand() {
    const [land, setLand] = useState<FeatureCollection | null>(null);
    useEffect(() => {
        let cancelled = false;
        import("world-atlas/land-50m.json").then((module) => {
            const topology = (module.default ?? module) as unknown as Topology;
            const collection = feature(topology, topology.objects.land) as FeatureCollection;
            if (!cancelled) setLand(collection);
        }).catch((error) => console.warn("[PolarMap] Land outlines failed to load", error));
        return () => { cancelled = true; };
    }, []);
    return land;
}

/** Width and height of an element, kept up to date. */
function useElementSize<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
        measure();
        if (typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    return [ref, size] as const;
}

type Gesture =
    | { kind: "pan"; startX: number; startY: number; view: View; moved: boolean }
    | { kind: "draw"; start: [number, number] };

/**
 * World map with two views: a flat Mercator map, or the Earth seen from above the
 * North or the South pole (azimuthal equidistant projection). Drawn as vectors
 * (Natural Earth coastlines, graticule).
 * Drag to pan, Ctrl/⌘ + wheel or the buttons to zoom, click a marker for its details.
 * In drawing mode, a drag draws a latitude/longitude box instead of panning.
 */
export default function PolarMap({
    points, height = 320, bounds = null, drawing = false, onBoundsDrawn, emptyMessage = "Nothing to show", legend,
    defaultProjection = "mercator",
}: PolarMapProps) {
    const theme = useTheme();
    const land = useLand();
    const [containerRef, { width }] = useElementSize<HTMLDivElement>();
    const svgRef = useRef<SVGSVGElement>(null);

    const validPoints = useMemo(() => points.filter(isValidPoint), [points]);
    const pointsKey = validPoints.map((point) => `${point.id}:${point.latitude}:${point.longitude}`).join("|");

    const [kind, setKind] = useState<MapProjection>(defaultProjection);
    const [hemisphere, setHemisphere] = useState<Hemisphere>(() => preferredHemisphere(validPoints));
    const [view, setView] = useState<View>(HOME_VIEW);
    const [openPointId, setOpenPointId] = useState<string | null>(null);
    const [draftBox, setDraftBox] = useState<GeoBox | null>(null);
    const [showZoomHint, setShowZoomHint] = useState(false);
    const gesture = useRef<Gesture | null>(null);

    const projection = useMemo(() => buildProjection(kind, hemisphere, width, height), [kind, hemisphere, width, height]);

    // New points (or a new size) re-frame the map, turned to the pole they are around.
    // Adjusted during render, not in an effect, so a stale frame is never painted.
    const sizeKey = `${width}x${height}`;
    const [framed, setFramed] = useState<{ points: string; size: string } | null>(null);
    if (width > 0 && (framed?.points !== pointsKey || framed.size !== sizeKey)) {
        const nextHemisphere = framed?.points === pointsKey ? hemisphere : preferredHemisphere(validPoints);
        setFramed({ points: pointsKey, size: sizeKey });
        setHemisphere(nextHemisphere);
        setView(fitView(buildProjection(kind, nextHemisphere, width, height), kind, nextHemisphere, validPoints, width, height));
    }

    const path = useMemo(() => geoPath(projection), [projection]);
    const spherePath = useMemo(() => path({ type: "Sphere" }) ?? "", [path]);
    const graticulePath = useMemo(() => path(geoGraticule().step([30, 15])()) ?? "", [path]);
    const landPath = useMemo(() => (land ? path(land) ?? "" : ""), [path, land]);

    const shownBox = draftBox ?? bounds;
    const boxPath = useMemo(() => {
        if (!shownBox) return "";
        const outline = geoGraticule()
            .extentMajor([[shownBox.west, shownBox.south], [shownBox.east, shownBox.north]])
            .outline();
        return path(outline) ?? "";
    }, [path, shownBox]);

    const centerX = width / 2;
    const centerY = height / 2;
    const toScreen = (xy: [number, number] | null): [number, number] | null =>
        xy ? [centerX + view.x + view.k * xy[0], centerY + view.y + view.k * xy[1]] : null;

    const toGeo = (clientX: number, clientY: number): [number, number] | null => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const x = (clientX - rect.left - centerX - view.x) / view.k;
        const y = (clientY - rect.top - centerY - view.y) / view.k;
        return projection.invert?.([x, y]) ?? null;
    };

    const zoomBy = (factor: number, anchorX = centerX, anchorY = centerY) => setView((prev) => {
        const k = clamp(prev.k * factor, MIN_ZOOM, MAX_ZOOM);
        const ratio = k / prev.k;
        return {
            k,
            x: anchorX - centerX - (anchorX - centerX - prev.x) * ratio,
            y: anchorY - centerY - (anchorY - centerY - prev.y) * ratio,
        };
    });

    // Wheel zoom needs Ctrl (⌘) so the map does not hijack the page scroll. A
    // non-passive native listener: React's onWheel cannot cancel the page scroll.
    const zoomRef = useRef(zoomBy);
    useEffect(() => { zoomRef.current = zoomBy; });
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;
        let hintTimer: ReturnType<typeof setTimeout> | undefined;
        const onWheel = (event: WheelEvent) => {
            if (!event.ctrlKey && !event.metaKey) {
                setShowZoomHint(true);
                clearTimeout(hintTimer);
                hintTimer = setTimeout(() => setShowZoomHint(false), 1200);
                return;
            }
            event.preventDefault();
            const rect = svg.getBoundingClientRect();
            zoomRef.current(Math.exp(-event.deltaY * 0.002), event.clientX - rect.left, event.clientY - rect.top);
        };
        svg.addEventListener("wheel", onWheel, { passive: false });
        return () => {
            svg.removeEventListener("wheel", onWheel);
            clearTimeout(hintTimer);
        };
    }, []);

    const boxBetween = ([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]): GeoBox => ({
        north: Math.max(lat1, lat2),
        south: Math.min(lat1, lat2),
        east: Math.max(lon1, lon2),
        west: Math.min(lon1, lon2),
    });

    const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
        if (event.button !== 0) return;
        if (drawing) {
            const start = toGeo(event.clientX, event.clientY);
            if (!start) return;
            gesture.current = { kind: "draw", start };
        } else {
            gesture.current = { kind: "pan", startX: event.clientX, startY: event.clientY, view, moved: false };
        }
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
        const current = gesture.current;
        if (!current) return;
        if (current.kind === "draw") {
            const end = toGeo(event.clientX, event.clientY);
            if (end) setDraftBox(boxBetween(current.start, end));
            return;
        }
        const dx = event.clientX - current.startX;
        const dy = event.clientY - current.startY;
        if (!current.moved && Math.hypot(dx, dy) < 3) return;
        current.moved = true;
        setView({ ...current.view, x: current.view.x + dx, y: current.view.y + dy });
    };

    const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
        const current = gesture.current;
        gesture.current = null;
        if (!current) return;
        if (current.kind === "draw") {
            const end = toGeo(event.clientX, event.clientY);
            setDraftBox(null);
            const box = end && boxBetween(current.start, end);
            if (box && box.north !== box.south && box.east !== box.west) onBoundsDrawn?.(box);
            return;
        }
        // A click on the background (no drag) closes the open popup.
        if (!current.moved) setOpenPointId(null);
    };

    const switchView = (nextKind: MapProjection, nextHemisphere: Hemisphere) => {
        setKind(nextKind);
        setHemisphere(nextHemisphere);
        setOpenPointId(null);
        setView(fitView(
            buildProjection(nextKind, nextHemisphere, width, height), nextKind, nextHemisphere, validPoints, width, height,
        ));
    };

    const shownPoints = validPoints.filter((point) => isOnMap(point, kind, hemisphere));
    const hiddenCount = validPoints.length - shownPoints.length;
    const otherHemisphere: Hemisphere = hemisphere === "north" ? "south" : "north";

    const markers = shownPoints
        .map((point) => ({ point, xy: toScreen(projection([point.longitude, point.latitude])) }))
        .filter((marker): marker is { point: MapPoint; xy: [number, number] } => marker.xy !== null);
    const openMarker = markers.find((marker) => marker.point.id === openPointId);

    // Polar: along the 45°E meridian. Mercator: along the left edge of the map.
    const labelLatitudes = kind === "mercator"
        ? [75, 60, 45, 30, 15, 0, -15, -30, -45, -60, -75]
        : hemisphere === "north" ? [75, 60, 45, 30, 15, 0, -15] : [-75, -60, -45, -30, -15, 0, 15];
    const parallelLabels = labelLatitudes
        .map((latitude) => {
            const xy = toScreen(projection([kind === "mercator" ? 0 : 45, latitude]));
            return { latitude, xy: xy && kind === "mercator" ? [4, xy[1]] as [number, number] : xy };
        })
        .filter((label): label is { latitude: number; xy: [number, number] } =>
            label.xy !== null && label.xy[0] > 0 && label.xy[0] < width && label.xy[1] > 0 && label.xy[1] < height);

    const colors = {
        background: ecotaxaColors.stone[50],
        ocean: ecotaxaColors.mainblue[100],
        land: theme.palette.common.white,
        coast: ecotaxaColors.stone[300],
        graticule: ecotaxaColors.mainblue[300],
    };

    return (
        <Box>
            <Box
                ref={containerRef}
                sx={{
                    position: "relative",
                    height,
                    borderRadius: 2,
                    overflow: "hidden",
                    border: 1,
                    borderColor: "divider",
                    bgcolor: colors.background,
                    userSelect: "none",
                }}
            >
                <svg
                    ref={svgRef}
                    width={width}
                    height={height}
                    role="img"
                    aria-label={kind === "mercator"
                        ? "Mercator map, world view"
                        : `Polar map, ${hemisphere === "north" ? "North" : "South"} pole view`}
                    style={{ display: "block", touchAction: "none", cursor: drawing ? "crosshair" : "grab" }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={() => { gesture.current = null; setDraftBox(null); }}
                >
                    <g transform={`translate(${centerX + view.x},${centerY + view.y}) scale(${view.k})`}>
                        <path d={spherePath} fill={colors.ocean} stroke={colors.graticule} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                        <path d={graticulePath} fill="none" stroke={colors.graticule} strokeOpacity={0.5} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
                        <path d={landPath} fill={colors.land} stroke={colors.coast} strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
                        {boxPath && (
                            <path
                                d={boxPath}
                                fill={theme.palette.primary.main}
                                fillOpacity={0.12}
                                stroke={theme.palette.primary.main}
                                strokeWidth={2}
                                vectorEffect="non-scaling-stroke"
                            />
                        )}
                    </g>

                    {parallelLabels.map(({ latitude, xy }) => (
                        <text
                            key={latitude}
                            x={xy[0] + 3}
                            y={xy[1] - 3}
                            fontSize={10}
                            fill={ecotaxaColors.mainblue[700]}
                            fillOpacity={0.7}
                            pointerEvents="none"
                        >
                            {formatLatitude(latitude)}
                        </text>
                    ))}

                    {markers.map(({ point, xy }) => (
                        <g
                            key={point.id}
                            transform={`translate(${xy[0]},${xy[1]})`}
                            role="button"
                            tabIndex={0}
                            aria-label={point.label}
                            style={{ cursor: "pointer", outline: "none" }}
                            onPointerDown={(event) => { if (!drawing) event.stopPropagation(); }}
                            onClick={() => !drawing && setOpenPointId(point.id)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") setOpenPointId(point.id);
                            }}
                        >
                            <title>{point.label}</title>
                            <path
                                d={markerPath(point.shape ?? "circle", MARKER_SIZE)}
                                fill={point.color}
                                stroke={point.ring ?? theme.palette.common.white}
                                strokeWidth={point.ring ? 2.5 : 1.2}
                                style={{ filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.35))" }}
                            />
                        </g>
                    ))}
                </svg>

                {openMarker && (
                    <Paper
                        elevation={4}
                        sx={{
                            position: "absolute",
                            left: openMarker.xy[0],
                            top: openMarker.xy[1] - MARKER_SIZE,
                            transform: "translate(-50%, -100%)",
                            px: 1.5,
                            py: 1,
                            pr: 4,
                            borderRadius: 1.5,
                            maxWidth: 280,
                        }}
                    >
                        <IconButton
                            size="small"
                            aria-label="Close"
                            onClick={() => setOpenPointId(null)}
                            sx={{ position: "absolute", top: 2, right: 2 }}
                        >
                            <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <Typography variant="subtitle2">{openMarker.point.label}</Typography>
                        {(openMarker.point.details ?? []).map((line) => (
                            <Typography key={line} variant="caption" color="text.secondary" component="div">{line}</Typography>
                        ))}
                        <Typography variant="caption" color="text.secondary" component="div">
                            Lat {openMarker.point.latitude.toFixed(5)}, Lon {openMarker.point.longitude.toFixed(5)}
                        </Typography>
                    </Paper>
                )}

                <Box sx={{ position: "absolute", top: 10, left: 10, right: 56, display: "flex", flexWrap: "wrap", gap: 1 }}>
                    <Paper elevation={2} sx={{ p: 0.5, borderRadius: 2 }}>
                        <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={kind}
                            onChange={(_event, next: MapProjection | null) => next && switchView(next, hemisphere)}
                            aria-label="Projection"
                        >
                            <ToggleButton value="mercator" sx={{ py: 0.25, px: 1, fontSize: 12 }}>Mercator</ToggleButton>
                            <ToggleButton value="polar" sx={{ py: 0.25, px: 1, fontSize: 12 }}>Polar</ToggleButton>
                        </ToggleButtonGroup>
                    </Paper>
                    {kind === "polar" && (
                        <Paper elevation={2} sx={{ p: 0.5, borderRadius: 2 }}>
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={hemisphere}
                                onChange={(_event, next: Hemisphere | null) => next && switchView("polar", next)}
                                aria-label="Pole"
                            >
                                <ToggleButton value="north" sx={{ py: 0.25, px: 1, fontSize: 12 }}>North pole</ToggleButton>
                                <ToggleButton value="south" sx={{ py: 0.25, px: 1, fontSize: 12 }}>South pole</ToggleButton>
                            </ToggleButtonGroup>
                        </Paper>
                    )}
                </Box>

                <Paper
                    elevation={2}
                    sx={{ position: "absolute", top: 10, right: 10, display: "flex", flexDirection: "column", borderRadius: 2 }}
                >
                    <Tooltip title="Zoom in" placement="left">
                        <IconButton size="small" aria-label="Zoom in" onClick={() => zoomBy(ZOOM_STEP)}>
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Zoom out" placement="left">
                        <IconButton size="small" aria-label="Zoom out" onClick={() => zoomBy(1 / ZOOM_STEP)}>
                            <RemoveIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={validPoints.length > 0 ? "Fit to points" : "Reset view"} placement="left">
                        <IconButton
                            size="small"
                            aria-label="Fit to points"
                            onClick={() => setView(fitView(projection, kind, hemisphere, validPoints, width, height))}
                        >
                            <CenterFocusStrongIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Paper>

                <Fade in={showZoomHint}>
                    <Box
                        sx={{
                            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                            bgcolor: "rgba(16, 32, 59, 0.35)", pointerEvents: "none",
                        }}
                    >
                        <Typography sx={{ color: "common.white", fontWeight: 500 }}>
                            Use Ctrl + scroll to zoom the map
                        </Typography>
                    </Box>
                </Fade>

                {kind === "polar" && hiddenCount > 0 && (
                    <Paper elevation={2} sx={{ position: "absolute", bottom: 10, left: 10, px: 1.5, py: 0.5, borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            {hiddenCount} more near the{" "}
                            <Link component="button" type="button" variant="caption" onClick={() => switchView("polar", otherHemisphere)}>
                                {otherHemisphere === "north" ? "North" : "South"} pole
                            </Link>
                        </Typography>
                    </Paper>
                )}

                {validPoints.length === 0 && (
                    <Paper
                        elevation={2}
                        sx={{
                            position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
                            px: 2, py: 1, pointerEvents: "none", borderRadius: 2,
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">{emptyMessage}</Typography>
                    </Paper>
                )}

                <Typography
                    variant="caption"
                    sx={{ position: "absolute", bottom: 4, right: 8, fontSize: 10, color: "text.secondary", pointerEvents: "none" }}
                >
                    Natural Earth
                </Typography>
            </Box>
            {legend}
        </Box>
    );
}
