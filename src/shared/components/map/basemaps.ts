import type { StyleSpecification } from "maplibre-gl";

export type BasemapId = "map" | "ocean" | "satellite";

/** A raster tile service wrapped as a one-layer MapLibre style. */
const rasterStyle = (tiles: string, attribution: string, maxzoom: number): StyleSpecification => ({
    version: 8,
    sources: {
        basemap: { type: "raster", tiles: [tiles], tileSize: 256, attribution, maxzoom },
    },
    layers: [{ id: "basemap", type: "raster", source: "basemap" }],
});

/**
 * Basemaps offered by the map switcher. None of them needs an API key:
 * - map: OpenFreeMap vector tiles (OpenStreetMap data),
 * - ocean: Esri Ocean basemap, with bathymetry shading (GEBCO, NOAA...),
 * - satellite: Esri World Imagery.
 */
export const BASEMAPS: Record<BasemapId, { label: string; style: string | StyleSpecification }> = {
    map: {
        label: "Map",
        style: "https://tiles.openfreemap.org/styles/liberty",
    },
    ocean: {
        label: "Ocean",
        style: rasterStyle(
            "https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
            "Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri",
            10,
        ),
    },
    satellite: {
        label: "Satellite",
        style: rasterStyle(
            "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
            18,
        ),
    },
};
