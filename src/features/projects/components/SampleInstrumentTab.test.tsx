import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SampleData } from "../api/projects.api";
import { SampleInstrumentTab } from "./SampleInstrumentTab";

const sample: SampleData = {
    sample_id: 1,
    sample_name: "tara_093_00_a",
    instrument_settings_aa: 0.016637,
    instrument_settings_exp: 1.1241,
    instrument_settings_image_volume_l: 1.03,
    instrument_settings_pixel_size_mm: 0.174,
    instrument_settings_acq_shutter_speed: 12,
    instrument_settings_acq_gain: 6,
    instrument_settings_acq_x_size: 1280,
    instrument_settings_images_post_process: "Zooprocess",
};

describe("SampleInstrumentTab", () => {
    it("shows the calibration and acquisition parameters read at import", () => {
        render(<SampleInstrumentTab sample={sample} />);

        expect(screen.getByLabelText("Aa")).toHaveValue("0.016637");
        expect(screen.getByLabelText("Image volume")).toHaveValue("1.03");
        expect(screen.getByLabelText("Shutter speed")).toHaveValue("12");
        expect(screen.getByLabelText("Xsize")).toHaveValue("1280");
        expect(screen.getByLabelText("Image post process")).toHaveValue("Zooprocess");
        // The processing date was never filled, not even in legacy EcoPart: no field for it.
        expect(screen.queryByLabelText("UTC date time")).toBeNull();
        // Missing values keep the field with a dash.
        expect(screen.getByLabelText("Threshold")).toHaveValue("—");
        expect(screen.getByRole("radio", { name: "Local calibration parameters" })).toBeChecked();
    });

    it("keeps the UVP DB recommendation disabled", () => {
        render(<SampleInstrumentTab sample={sample} />);

        expect(screen.getByRole("button", { name: /fetch recommendation/i })).toBeDisabled();
    });
});
