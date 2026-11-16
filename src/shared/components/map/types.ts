import type { ReactNode } from "react";

import type { PopupLink } from "../PopupLinks";

export type Hemisphere = "north" | "south";

/** Flat world map, or the Earth seen from above a pole. */
export type MapProjection = "mercator" | "polar";

/**
 * `pin`: the location pin of the MUI `LocationOn` icon, its tip on the point. `cross`: an X centred on the point.
 * `diamond`: a square standing on a corner.
 */
export type MarkerShape = "circle" | "triangle" | "square" | "diamond" | "pin" | "cross";

/**
 * `solid`: 12 px markers at every zoom, their outline drawn over them.
 * `fine`, for maps of thousands of points: the markers grow with the zoom (3.6 px on the world
 * view, 9 px close up) and wear a thin halo that keeps touching markers apart; they are drawn in a
 * mixed order that stays the same, so that no colour always covers another; every marker is a
 * circle until the zoom where a shape can be told apart. Pins keep their size and shape in both.
 */
export type MarkerStyle = "solid" | "fine";

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
    /** Links under the popup lines (the pages of the point's sample, project…). */
    links?: PopupLink[];
    /** Fill (any CSS color). */
    color: string;
    shape?: MarkerShape;
    /** Outline color, drawn thicker (e.g. to flag the user's own data). */
    ring?: string;
}

export interface PolarMapProps {
    /** Points with missing or out-of-range coordinates are skipped. */
    points: MapPoint[];
    /** Map height in px (the smallest one, with `maxHeight`). */
    height?: number;
    /** When set, the map grows with its width (to half of it), from `height` up to `maxHeight` px. */
    maxHeight?: number;
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
    /** Outline of the markers without `ring` (white by default), null for none. The halo of `fine` markers. */
    markerOutline?: string | null;
    /** How the markers are drawn, `solid` by default (see `MarkerStyle`). */
    markerStyle?: MarkerStyle;
    /**
     * Without it, the map frames its points again whenever they change. With it, new points keep
     * the view as the user left it, until the key changes: the next new points are framed then.
     */
    fitKey?: string | number;
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
