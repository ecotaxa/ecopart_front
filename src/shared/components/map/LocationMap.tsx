import PolarMap from "./PolarMap";
import type { LocationMapProps } from "./types";

const DEFAULT_MARKER_COLOR = "#e91e63";

/** Polar map of a few named locations (e.g. the positions of a sample). */
export default function LocationMap({ locations, height = 320 }: LocationMapProps) {
    return (
        <PolarMap
            points={locations.map((location) => ({ ...location, color: location.color ?? DEFAULT_MARKER_COLOR }))}
            height={height}
            emptyMessage="No location available"
        />
    );
}
