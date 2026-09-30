import { useCallback, useMemo, useRef, useState } from "react";
import Map, {
    FullscreenControl, Marker, NavigationControl, Popup, ScaleControl, type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Box, IconButton, Paper, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";

import { BASEMAPS, type BasemapId } from "./basemaps";
import type { LocationMapProps, MapLocation } from "./types";

const DEFAULT_MARKER_COLOR = "#e91e63";
// Ocean-basin scale: a sample reads better in its wide context than close up.
const DEFAULT_MAX_ZOOM = 1.3;

const isValidLocation = ({ latitude, longitude }: MapLocation) =>
    Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;

const formatCoordinate = (value: number) => value.toFixed(5);

/**
 * Interactive map of a few named locations: basemap switcher (map / ocean
 * bathymetry / satellite), zoom, fullscreen, scale, a popup per marker and a
 * button that re-frames every location. Wheel zoom needs Ctrl (Cmd) so the map
 * does not hijack the page scroll.
 */
export default function LocationMap({
    locations, height = 320, initialBasemap = "ocean", maxFitZoom = DEFAULT_MAX_ZOOM,
}: LocationMapProps) {
    const mapRef = useRef<MapRef>(null);
    const [basemap, setBasemap] = useState<BasemapId>(initialBasemap);
    const [openLocationId, setOpenLocationId] = useState<string | null>(null);

    const validLocations = useMemo(() => locations.filter(isValidLocation), [locations]);
    const openLocation = validLocations.find((location) => location.id === openLocationId);

    const fitToLocations = useCallback((animate: boolean) => {
        const map = mapRef.current;
        if (!map || validLocations.length === 0) return;
        const duration = animate ? 800 : 0;

        if (validLocations.length === 1) {
            const [{ longitude, latitude }] = validLocations;
            map.flyTo({ center: [longitude, latitude], zoom: maxFitZoom, duration });
            return;
        }
        const longitudes = validLocations.map((location) => location.longitude);
        const latitudes = validLocations.map((location) => location.latitude);
        map.fitBounds(
            [[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]],
            { padding: 60, maxZoom: maxFitZoom, duration },
        );
    }, [validLocations, maxFitZoom]);

    return (
        <Box
            sx={{
                position: "relative",
                height,
                borderRadius: 1,
                overflow: "hidden",
                border: 1,
                borderColor: "divider",
            }}
        >
            <Map
                ref={mapRef}
                initialViewState={{ longitude: 0, latitude: 20, zoom: 1 }}
                mapStyle={BASEMAPS[basemap].style}
                style={{ width: "100%", height: "100%" }}
                cooperativeGestures
                attributionControl={{ compact: true }}
                onLoad={() => fitToLocations(false)}
            >
                <NavigationControl position="top-right" />
                <FullscreenControl position="top-right" />
                <ScaleControl position="bottom-left" />

                {validLocations.map((location) => (
                    <Marker
                        key={location.id}
                        longitude={location.longitude}
                        latitude={location.latitude}
                        anchor="bottom"
                        onClick={(event) => {
                            // Keep the click from reaching the map, which would close the popup right away.
                            event.originalEvent.stopPropagation();
                            setOpenLocationId(location.id);
                        }}
                    >
                        <LocationOnIcon
                            aria-label={location.label}
                            sx={{
                                display: "block",
                                fontSize: 34,
                                color: location.color ?? DEFAULT_MARKER_COLOR,
                                cursor: "pointer",
                                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.45))",
                            }}
                        />
                    </Marker>
                ))}

                {openLocation && (
                    <Popup
                        longitude={openLocation.longitude}
                        latitude={openLocation.latitude}
                        anchor="bottom"
                        offset={34}
                        closeOnClick={false}
                        onClose={() => setOpenLocationId(null)}
                    >
                        <Typography variant="subtitle2" color="text.primary">{openLocation.label}</Typography>
                        <Typography variant="caption" color="text.secondary" component="div">
                            Lat {formatCoordinate(openLocation.latitude)}, Lon {formatCoordinate(openLocation.longitude)}
                        </Typography>
                    </Popup>
                )}
            </Map>

            {/* Basemap switcher + re-frame button */}
            <Paper
                elevation={2}
                sx={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 0.5, p: 0.5 }}
            >
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={basemap}
                    onChange={(_event, value: BasemapId | null) => value && setBasemap(value)}
                    aria-label="Basemap"
                >
                    {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
                        <ToggleButton key={id} value={id} sx={{ py: 0.25, px: 1, fontSize: 12 }}>
                            {BASEMAPS[id].label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
                {validLocations.length > 0 && (
                    <Tooltip title="Fit to locations">
                        <IconButton size="small" onClick={() => fitToLocations(true)} aria-label="Fit to locations">
                            <CenterFocusStrongIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Paper>

            {validLocations.length === 0 && (
                <Paper
                    elevation={2}
                    sx={{
                        position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
                        px: 2, py: 1, pointerEvents: "none",
                    }}
                >
                    <Typography variant="body2" color="text.secondary">No location available</Typography>
                </Paper>
            )}
        </Box>
    );
}
