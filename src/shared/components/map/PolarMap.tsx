import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
/**
 * Above this many points the markers are painted on a canvas instead of being SVG
 * elements: the Explore map shows every sample of the application (tens of thousands),
 * and as many SVG markers froze the page for over a minute.
 */
const CANVAS_MARKER_THRESHOLD = 500;
/** How far (px) from a painted marker's centre a click still opens it. */
const PAINTED_MARKER_REACH = MARKER_SIZE / 2 + 3;
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
    // A loop, not Math.min(...xs): spreading ~100k points overflows the call stack.
    let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity];
    for (const point of points) {
        if (!isOnMap(point, kind, hemisphere)) continue;
        const xy = projection([point.longitude, point.latitude]);
        if (!xy) continue;
        [minX, maxX, minY, maxY] = [Math.min(minX, xy[0]), Math.max(maxX, xy[0]), Math.min(minY, xy[1]), Math.max(maxY, xy[1])];
    }
    if (minX === Infinity) return HOME_VIEW;

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

/** The MUI `LocationOn` icon (24×24 box, tip at 12,22), so the map pin matches the icon used next to it. */
const PIN_PATH = "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7m0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5";
const PIN_SIZE = 30;
const PIN_SCALE = PIN_SIZE / 24;
const PIN_TRANSFORM = `translate(${-12 * PIN_SCALE},${-22 * PIN_SCALE}) scale(${PIN_SCALE})`;

const EARTH_RADIUS_KM = 6371;
const SCALE_BAR_MAX_PX = 100;

/** The longest round distance (1, 2 or 5 × 10ⁿ km) drawn in at most `SCALE_BAR_MAX_PX`. */
function scaleBar(pxPerKm: number) {
    if (!(pxPerKm > 0) || !Number.isFinite(pxPerKm)) return null;
    const maxKm = SCALE_BAR_MAX_PX / pxPerKm;
    const magnitude = 10 ** Math.floor(Math.log10(maxKm));
    const km = [5, 2, 1].map((step) => step * magnitude).find((value) => value <= maxKm) ?? magnitude;
    return { km, px: km * pxPerKm, label: `${km.toLocaleString("en-US", { maximumFractionDigits: 3 })} km` };
}

const markerPath = (shape: MarkerShape, size: number) => {
    const h = size / 2;
    if (shape === "pin") return PIN_PATH;
    if (shape === "triangle") return `M0,${-h}L${h},${h * 0.8}L${-h},${h * 0.8}Z`;
    if (shape === "square") return `M${-h * 0.85},${-h * 0.85}h${h * 1.7}v${h * 1.7}h${-h * 1.7}Z`;
    // An X centred on the position, drawn as a thin outline.
    if (shape === "cross") {
        const t = h * 0.28;
        return `M${-h},${-h + t}L${-h + t},${-h}L0,${-t}L${h - t},${-h}L${h},${-h + t}L${t},0L${h},${h - t}L${h - t},${h}L0,${t}L${-h + t},${h}L${-h},${h - t}L${-t},0Z`;
    }
    return `M${h},0A${h},${h} 0 1,1 ${-h},0A${h},${h} 0 1,1 ${h},0Z`;
};

/** A marker placed on the screen, on one copy of the world. */
interface ScreenMarker {
    key: string;
    point: MapPoint;
    xy: [number, number];
}

/** Adds to `path` the outline of a marker placed at `x, y` (its tip, for a pin). */
function traceMarker(path: Path2D, shape: MarkerShape, x: number, y: number) {
    const h = MARKER_SIZE / 2;
    if (shape === "circle") {
        path.moveTo(x + h, y);
        path.arc(x, y, h, 0, 2 * Math.PI);
    } else if (shape === "triangle") {
        path.moveTo(x, y - h);
        path.lineTo(x + h, y + h * 0.8);
        path.lineTo(x - h, y + h * 0.8);
        path.closePath();
    } else if (shape === "square") {
        path.rect(x - h * 0.85, y - h * 0.85, h * 1.7, h * 1.7);
    } else {
        const matrix = shape === "pin"
            ? new DOMMatrix().translateSelf(x - 12 * PIN_SCALE, y - 22 * PIN_SCALE).scaleSelf(PIN_SCALE)
            : new DOMMatrix().translateSelf(x, y);
        path.addPath(new Path2D(markerPath(shape, MARKER_SIZE)), matrix);
    }
}

/**
 * Paints the markers in one batch per look (shape, fill, outline), so a few fill and
 * stroke calls draw any number of them. The ringed ones (the user's data) go on top.
 */
function paintMarkers(context: CanvasRenderingContext2D, markers: ScreenMarker[], outline: string) {
    const batches = new Map<string, { point: MapPoint; path: Path2D }>();
    for (const { point, xy } of markers) {
        const shape = point.shape ?? "circle";
        const look = `${shape}|${point.color}|${point.ring ?? ""}`;
        let batch = batches.get(look);
        if (!batch) {
            batch = { point, path: new Path2D() };
            batches.set(look, batch);
        }
        traceMarker(batch.path, shape, xy[0], xy[1]);
    }
    const ordered = [...batches.values()].sort((a, b) => Number(a.point.ring !== undefined) - Number(b.point.ring !== undefined));
    for (const { point, path } of ordered) {
        context.fillStyle = point.color;
        context.fill(path);
        context.strokeStyle = point.ring ?? outline;
        context.lineWidth = point.ring ? 2.5 : 1.2;
        context.stroke(path);
    }
}

/** The painted marker under a position of the map (the closest within reach), if any. */
function paintedMarkerAt(markers: ScreenMarker[], x: number, y: number): ScreenMarker | null {
    let closest: ScreenMarker | null = null;
    let closestDistance = Infinity;
    for (const marker of markers) {
        const isPin = marker.point.shape === "pin";
        // A pin stands above its point: its head is what gets clicked.
        const distance = Math.hypot(x - marker.xy[0], y - (isPin ? marker.xy[1] - PIN_SIZE * 0.6 : marker.xy[1]));
        if (distance <= (isPin ? PIN_SIZE / 2 : PAINTED_MARKER_REACH) && distance < closestDistance) {
            closest = marker;
            closestDistance = distance;
        }
    }
    return closest;
}

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
    /** `lastLongitude` is unwrapped (may leave [-180, 180]) so the box follows the pointer across the antimeridian. */
    | { kind: "draw"; start: [number, number]; lastLongitude: number };

/** `longitude` shifted by whole turns to lie within 180° of `reference`. */
const unwrapLongitude = (longitude: number, reference: number) =>
    longitude + 360 * Math.round((reference - longitude) / 360);

const normalizeLongitude = (longitude: number) => ((((longitude + 180) % 360) + 360) % 360) - 180;

/** The box between two corners, `end` given with an unwrapped longitude. */
function boxBetween([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]): GeoBox {
    const north = Math.max(lat1, lat2);
    const south = Math.min(lat1, lat2);
    const [west, east] = [Math.min(lon1, lon2), Math.max(lon1, lon2)];
    if (east - west >= 360) return { north, south, west: -180, east: 180 };
    // Kept as drawn when inside [-180, 180]; otherwise it crosses the antimeridian (west > east).
    if (west >= -180 && east <= 180) return { north, south, west, east };
    return { north, south, west: normalizeLongitude(west), east: normalizeLongitude(east) };
}

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
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const worldId = `map-world-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

    const validPoints = useMemo(() => points.filter(isValidPoint), [points]);
    const pointsKey = useMemo(
        () => validPoints.map((point) => `${point.id}:${point.latitude}:${point.longitude}`).join("|"),
        [validPoints],
    );
    const painted = validPoints.length > CANVAS_MARKER_THRESHOLD;

    const [kind, setKind] = useState<MapProjection>(defaultProjection);
    const [hemisphere, setHemisphere] = useState<Hemisphere>(() => preferredHemisphere(validPoints));
    const [view, setView] = useState<View>(HOME_VIEW);
    /** `<point id>#<copy>`: a point drawn on several copies of the world opens on the clicked one. */
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
            // Across the antimeridian, the east edge is taken one turn further.
            .extentMajor([
                [shownBox.west, shownBox.south],
                [shownBox.east + (shownBox.west > shownBox.east ? 360 : 0), shownBox.north],
            ])
            .outline();
        return path(outline) ?? "";
    }, [path, shownBox]);

    const centerX = width / 2;
    const centerY = height / 2;
    const toScreen = (xy: [number, number] | null): [number, number] | null =>
        xy ? [centerX + view.x + view.k * xy[0], centerY + view.y + view.k * xy[1]] : null;

    // Mercator repeats the world side by side, so a horizontal drag never runs out
    // of map: `copies` are the offsets (in world widths) of the copies in view.
    const worldWidth = 2 * Math.PI * projection.scale();
    const wrapX = (x: number) => ((((x + worldWidth / 2) % worldWidth) + worldWidth) % worldWidth) - worldWidth / 2;
    const copies = useMemo(() => {
        if (kind !== "mercator") return [0];
        const first = Math.floor(((-centerX - view.x) / view.k + worldWidth / 2) / worldWidth);
        const last = Math.floor(((width - centerX - view.x) / view.k + worldWidth / 2) / worldWidth);
        return Array.from({ length: Math.min(last - first + 1, 8) }, (_, index) => first + index);
    }, [kind, centerX, width, view, worldWidth]);

    const shownPoints = useMemo(
        () => validPoints.filter((point) => isOnMap(point, kind, hemisphere)),
        [validPoints, kind, hemisphere],
    );
    const hiddenCount = validPoints.length - shownPoints.length;
    const otherHemisphere: Hemisphere = hemisphere === "north" ? "south" : "north";

    // Projected once per projection: panning and zooming only move them.
    const projectedPoints = useMemo(() => shownPoints.flatMap((point) => {
        const xy = projection([point.longitude, point.latitude]);
        return xy ? [{ point, xy }] : [];
    }), [shownPoints, projection]);

    const markers = useMemo(() => {
        const placed: ScreenMarker[] = [];
        for (const { point, xy } of projectedPoints) {
            const y = centerY + view.y + view.k * xy[1];
            for (const copy of copies) {
                const x = centerX + view.x + view.k * (xy[0] + copy * worldWidth);
                if (kind === "mercator" && (x <= -PIN_SIZE || x >= width + PIN_SIZE)) continue;
                placed.push({ key: `${point.id}#${copy}`, point, xy: [x, y] });
            }
        }
        return placed;
    }, [projectedPoints, copies, view, centerX, centerY, worldWidth, kind, width]);
    const openMarker = markers.find((marker) => marker.key === openPointId);

    const toGeo = (clientX: number, clientY: number): [number, number] | null => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const x = (clientX - rect.left - centerX - view.x) / view.k;
        const y = (clientY - rect.top - centerY - view.y) / view.k;
        return projection.invert?.([kind === "mercator" ? wrapX(x) : x, y]) ?? null;
    };

    // Polar: distances from the pole are true. Mercator: the scale grows as 1 / cos(latitude).
    const centerLatitude = projection.invert?.([-view.x / view.k, -view.y / view.k])?.[1] ?? 0;
    const pxPerKm = (view.k * projection.scale() / EARTH_RADIUS_KM)
        / (kind === "mercator" ? Math.cos(centerLatitude * Math.PI / 180) : 1);
    const scale = scaleBar(pxPerKm);

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

    /** The pointer position, its longitude unwrapped against the previous one of the drawing. */
    const drawEnd = (event: ReactPointerEvent, draw: Extract<Gesture, { kind: "draw" }>): [number, number] | null => {
        const end = toGeo(event.clientX, event.clientY);
        if (!end) return null;
        draw.lastLongitude = unwrapLongitude(end[0], draw.lastLongitude);
        return [draw.lastLongitude, end[1]];
    };

    const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
        if (event.button !== 0) return;
        if (drawing) {
            const start = toGeo(event.clientX, event.clientY);
            if (!start) return;
            gesture.current = { kind: "draw", start, lastLongitude: start[0] };
        } else {
            gesture.current = { kind: "pan", startX: event.clientX, startY: event.clientY, view, moved: false };
        }
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    /** The painted marker under the pointer (the SVG markers handle their own events). */
    const paintedMarkerUnder = (event: ReactPointerEvent) => {
        const rect = svgRef.current?.getBoundingClientRect();
        return painted && rect ? paintedMarkerAt(markers, event.clientX - rect.left, event.clientY - rect.top) : null;
    };

    const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
        const current = gesture.current;
        if (!current) {
            if (painted && !drawing) event.currentTarget.style.cursor = paintedMarkerUnder(event) ? "pointer" : "grab";
            return;
        }
        if (current.kind === "draw") {
            const end = drawEnd(event, current);
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
            const end = drawEnd(event, current);
            setDraftBox(null);
            const box = end && boxBetween(current.start, end);
            if (box && box.north !== box.south && box.east !== box.west) onBoundsDrawn?.(box);
            return;
        }
        // A click (no drag) opens the painted marker under it; on the background, it closes the open popup.
        if (!current.moved) setOpenPointId(paintedMarkerUnder(event)?.key ?? null);
    };

    const switchView = (nextKind: MapProjection, nextHemisphere: Hemisphere) => {
        setKind(nextKind);
        setHemisphere(nextHemisphere);
        setOpenPointId(null);
        setView(fitView(
            buildProjection(nextKind, nextHemisphere, width, height), nextKind, nextHemisphere, validPoints, width, height,
        ));
    };

    const markerOutline = theme.palette.common.white;
    // Before the browser paints, so the markers never lag a frame behind the panned map.
    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        const ratio = window.devicePixelRatio || 1;
        const [pixelWidth, pixelHeight] = [Math.round(width * ratio), Math.round(height * ratio)];
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
        }
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);
        paintMarkers(context, markers, markerOutline);
    }, [markers, width, height, markerOutline]);

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
                    <defs>
                        <g id={worldId}>
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
                    </defs>
                    <g transform={`translate(${centerX + view.x},${centerY + view.y}) scale(${view.k})`}>
                        {copies.map((copy) => <use key={copy} href={`#${worldId}`} x={copy * worldWidth} />)}
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

                    {!painted && markers.map(({ key, point, xy }) => {
                        const isPin = point.shape === "pin";
                        return (
                            <g
                                key={key}
                                transform={`translate(${xy[0]},${xy[1]})`}
                                role="button"
                                tabIndex={0}
                                aria-label={point.label}
                                style={{ cursor: "pointer", outline: "none" }}
                                onPointerDown={(event) => { if (!drawing) event.stopPropagation(); }}
                                onClick={() => !drawing && setOpenPointId(key)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") setOpenPointId(key);
                                }}
                            >
                                <title>{point.label}</title>
                                <path
                                    d={markerPath(point.shape ?? "circle", MARKER_SIZE)}
                                    transform={isPin ? PIN_TRANSFORM : undefined}
                                    fill={point.color}
                                    stroke={point.ring ?? theme.palette.common.white}
                                    strokeWidth={(point.ring ? 2.5 : 1.2) / (isPin ? PIN_SCALE : 1)}
                                    style={{ filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.35))" }}
                                />
                            </g>
                        );
                    })}
                </svg>
                {painted && (
                    <canvas
                        ref={canvasRef}
                        aria-hidden
                        style={{ position: "absolute", top: 0, left: 0, width, height, pointerEvents: "none" }}
                    />
                )}

                {openMarker && (
                    <Paper
                        elevation={4}
                        sx={{
                            position: "absolute",
                            left: openMarker.xy[0],
                            top: openMarker.xy[1] - (openMarker.point.shape === "pin" ? PIN_SIZE : MARKER_SIZE),
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

                {scale && (
                    <Box
                        aria-label={`Scale: ${scale.label}`}
                        sx={{
                            position: "absolute", bottom: 10, left: 10, width: scale.px, boxSizing: "border-box",
                            border: 2, borderTop: 0, borderColor: "text.secondary",
                            bgcolor: "rgba(255, 255, 255, 0.75)", px: 0.5, pointerEvents: "none",
                            fontSize: 11, lineHeight: "16px", color: "text.primary", whiteSpace: "nowrap",
                        }}
                    >
                        {scale.label}
                    </Box>
                )}

                {kind === "polar" && hiddenCount > 0 && (
                    <Paper elevation={2} sx={{ position: "absolute", bottom: 36, left: 10, px: 1.5, py: 0.5, borderRadius: 2 }}>
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
