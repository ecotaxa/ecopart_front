import { lazy, Suspense } from "react";
import { Skeleton } from "@mui/material";

import type { LocationMapProps } from "./types";

export type { LocationMapProps, MapLocation } from "./types";

// MapLibre weighs ~1 MB: load it only when a map is actually displayed.
const LazyLocationMap = lazy(() => import("./LocationMap"));

export function LocationMap(props: LocationMapProps) {
    return (
        <Suspense fallback={<Skeleton variant="rounded" height={props.height ?? 320} />}>
            <LazyLocationMap {...props} />
        </Suspense>
    );
}
