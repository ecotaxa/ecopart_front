import type { BasemapId } from "./basemaps";

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
    /** Map height (px number or any CSS length). */
    height?: number | string;
    initialBasemap?: BasemapId;
    /** Zoom used for a single location, and the closest zoom when framing several. */
    maxFitZoom?: number;
}
