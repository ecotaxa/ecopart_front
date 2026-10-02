import type { MapLocation } from "@/shared/components/map";
import type { SampleData } from "../api/projects.api";

export const METADATA_LOCATION_COLOR = "#e91e63";
export const CTD_LOCATION_COLOR = "#ff9800";

export const hasCoordinates = (latitude?: number | null, longitude?: number | null) =>
    latitude != null && longitude != null;

/** The map markers of a sample: its imported metadata position and, when known, the CTD one. */
export const buildSampleMapLocations = (
    sample: Pick<SampleData, "latitude" | "longitude" | "ctd_latitude" | "ctd_longitude">,
): MapLocation[] => {
    const locations: MapLocation[] = [];
    if (hasCoordinates(sample.latitude, sample.longitude)) {
        locations.push({
            id: "metadata",
            label: "Location from imported metadata",
            latitude: sample.latitude as number,
            longitude: sample.longitude as number,
            color: METADATA_LOCATION_COLOR,
        });
    }
    if (hasCoordinates(sample.ctd_latitude, sample.ctd_longitude)) {
        locations.push({
            id: "ctd",
            label: "Location from imported CTD file",
            latitude: sample.ctd_latitude as number,
            longitude: sample.ctd_longitude as number,
            color: CTD_LOCATION_COLOR,
        });
    }
    return locations;
};
