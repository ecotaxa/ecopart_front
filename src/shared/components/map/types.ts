import type { ReactNode } from "react";

export type Hemisphere = "north" | "south";

/** Flat world map, or the Earth seen from above a pole. */
export type MapProjection = "mercator" | "polar";

/** `pin`: the location pin of the MUI `LocationOn` icon, its tip on the point. */
export type MarkerShape = "circle" | "triangle" | "square" | "pin";

/**
 * Latitude / longitude box, in decimal degrees (longitudes in [-180, 180]).
 * `west > east` means the box crosses the antimeridian (GeoJSON bbox convention).
 */
export interface GeoBox {
    north: number;
    south: number;
    east: number;
    west: number;
}

/** A marker of the map. */
export interface MapPoint {
    /** Stable key, also used to open the point's popup. */
    id: string;
    latitude: number;
    longitude: number;
    /** Popup title and accessible name. */
    label: string;
    /** Extra popup lines. */
    details?: string[];
    /** Fill (any CSS color). */
    color: string;
    shape?: MarkerShape;
    /** Outline color, drawn thicker (e.g. to flag the user's own data). */
    ring?: string;
}

export interface PolarMapProps {
    /** Points with missing or out-of-range coordinates are skipped. */
    points: MapPoint[];
    /** Map height in px. */
    height?: number;
    /** Highlighted latitude / longitude box. */
    bounds?: GeoBox | null;
    /** When on, a drag draws a box (reported by `onBoundsDrawn`) instead of panning. */
    drawing?: boolean;
    onBoundsDrawn?: (bounds: GeoBox) => void;
    /** Shown over the map when there is no point. */
    emptyMessage?: string;
    /** Rendered under the map. */
    legend?: ReactNode;
    /** View shown first; the user can switch between both. */
    defaultProjection?: MapProjection;
}

export interface MapLocation {
    /** Stable key, also used to open the location's popup. */
    id: string;
    latitude: number;
    longitude: number;
    /** Shown in the marker popup. */
    label: string;
    /** Marker color (any CSS color). */
    color?: string;
}

export interface LocationMapProps {
    /** Locations with missing or out-of-range coordinates are skipped. */
    locations: MapLocation[];
    /** Map height in px. */
    height?: number;
}
