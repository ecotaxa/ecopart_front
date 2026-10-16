import { lazy, Suspense } from "react";
import { Skeleton } from "@mui/material";

import type { LocationMapProps, PolarMapProps } from "./types";

export type { GeoBox, LocationMapProps, MapLocation, MapPoint, MarkerShape, PolarMapProps } from "./types";

// d3-geo and the coastlines are only needed once a map is displayed.
const LazyLocationMap = lazy(() => import("./LocationMap"));
const LazyPolarMap = lazy(() => import("./PolarMap"));

const fallback = (height = 320) => <Skeleton variant="rounded" height={height} />;

export function LocationMap(props: LocationMapProps) {
    return (
        <Suspense fallback={fallback(props.height)}>
            <LazyLocationMap {...props} />
        </Suspense>
    );
}

export function PolarMap(props: PolarMapProps) {
    return (
        <Suspense fallback={fallback(props.height)}>
            <LazyPolarMap {...props} />
        </Suspense>
    );
}
