import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

import { RANDOM_IMAGE_COUNT } from "../api/explore.api";
import type { ExploreImage, ExploreMode } from "../types/explore.types";

const caption = (image: ExploreImage, mode: ExploreMode) => {
    if (mode === "depth" && image.depth != null) return `${image.sample_name} · ${image.depth} m`;
    if (mode === "time" && image.date) return `${image.sample_name} · ${new Date(image.date).toLocaleString("en-GB", { timeZone: "UTC" })}`;
    return image.sample_name;
};

interface RandomImagesProps {
    images: ExploreImage[];
    mode: ExploreMode;
    /** Draws another set of random objects of the selection. */
    onRefresh: () => void;
    disabled: boolean;
}

/** A few random object images of the selection, redrawn with the refresh button. */
export default function RandomImages({ images, mode, onRefresh, disabled }: RandomImagesProps) {
    return (
        <Box>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="subtitle1">A few random images</Typography>
                <Tooltip title="Other random images">
                    <span>
                        <IconButton onClick={onRefresh} disabled={disabled} aria-label="Other random images">
                            <RefreshIcon />
                        </IconButton>
                    </span>
                </Tooltip>
            </Stack>
            {images.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No image</Typography>
            ) : (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: `repeat(${RANDOM_IMAGE_COUNT}, 1fr)` }, gap: 2 }}>
                    {images.map((image) => (
                        <Box key={image.object_id} component="figure" sx={{ m: 0, textAlign: "center" }}>
                            <Box
                                component="img"
                                src={image.image_url}
                                alt={`Object ${image.object_id}`}
                                loading="lazy"
                                sx={{ maxWidth: "100%", maxHeight: 180, objectFit: "contain" }}
                            />
                            <Typography component="figcaption" variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                {caption(image, mode)}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}
