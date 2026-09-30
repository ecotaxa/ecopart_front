import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Project, SampleData } from "../api/projects.api";
import type { LocationMapProps } from "@/shared/components/map";
import { SampleMetadataTab } from "./SampleMetadataTab";

// jsdom has no WebGL: replace the map by a list of the locations it receives.
vi.mock("@/shared/components/map", () => ({
    LocationMap: ({ locations }: LocationMapProps) => (
        <ul data-testid="location-map">
            {locations.map((location) => <li key={location.id}>{location.id}</li>)}
        </ul>
    ),
}));

const sample: SampleData = {
    sample_id: 1,
    sample_name: "tara_093_00_a",
    sample_type_label: "Depth",
    sampling_utc_date_time: "2011-03-11T19:42:10.000Z",
    instrument_serial_number: "000002LP",
    max_pressure: 133,
    station_id: "tara_093_00_a",
    latitude: -33.45717,
    longitude: -72.15433,
    wind_direction: 270,
    wind_speed: 10,
    sea_state: "3",
    nebulousness: 1,
    bottom_depth: 133,
    instrument_operator_email: "operator@example.org",
    ctd_latitude: null,
    ctd_longitude: null,
};

describe("SampleMetadataTab", () => {
    it("shows the imported metadata in read-only fields", () => {
        render(<SampleMetadataTab project={undefined} sample={sample} />);

        const sampleIdField = screen.getByLabelText("Sample ID");
        expect(sampleIdField).toHaveValue("tara_093_00_a");
        expect(sampleIdField).toHaveAttribute("readonly");
        expect(screen.getByLabelText("UTC date & time")).toHaveValue("2011-03-11 19:42:10");
        expect(screen.getByLabelText("Sampling date")).toHaveValue("UTC  2011-03-11 19:42:10");
        expect(screen.getByLabelText("Wind direction (0-360)")).toHaveValue("270");
        expect(screen.getByText("Deg")).toBeInTheDocument();
        expect(screen.getByLabelText("Email")).toHaveValue("operator@example.org");
        // No project operator to take the name from: shown as a dash.
        expect(screen.getByLabelText("Name")).toHaveValue("—");
    });

    it("takes the operator name from the project when it is the same operator", () => {
        const project = { operator_name: "Jane Doe", operator_email: "Operator@Example.org " } as Project;
        const { unmount } = render(<SampleMetadataTab project={project} sample={sample} />);
        expect(screen.getByLabelText("Name")).toHaveValue("Jane Doe");
        unmount();

        render(<SampleMetadataTab project={{ ...project, operator_email: "other@example.org" }} sample={sample} />);
        expect(screen.getByLabelText("Name")).toHaveValue("—");
    });

    it("uses the metadata location and greys out the CTD one until the backend provides it", () => {
        render(<SampleMetadataTab project={undefined} sample={sample} />);

        expect(screen.getByRole("radio", { name: "Location from imported metadata" })).toBeChecked();
        const ctdRadio = screen.getByRole("radio", { name: "Location from imported CTD file" });
        expect(ctdRadio).not.toBeChecked();
        expect(ctdRadio).toBeDisabled();
        expect(screen.getByText("Not available yet")).toBeInTheDocument();
        expect(screen.getAllByLabelText("Latitude")[0]).toHaveValue("-33.45717");

        expect(screen.getByTestId("location-map")).toHaveTextContent("metadata");
        expect(screen.getByTestId("location-map")).not.toHaveTextContent("ctd");
    });

    it("puts the CTD location on the map once it is available", () => {
        render(<SampleMetadataTab project={undefined} sample={{ ...sample, ctd_latitude: -22.45717, ctd_longitude: -43.15433 }} />);

        expect(screen.getByRole("radio", { name: "Location from imported CTD file" })).toBeEnabled();
        expect(screen.getAllByLabelText("Latitude")[1]).toHaveValue("-22.45717");
        expect(screen.getByTestId("location-map")).toHaveTextContent("ctd");
    });
});
