import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Project, SampleData } from "../api/projects.api";
import { selectSampleCoordinates } from "../api/projects.api";
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

vi.mock("../api/projects.api", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../api/projects.api")>()),
    selectSampleCoordinates: vi.fn(),
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
    use_ctd_coordinates: false,
};

const sampleWithCtd: SampleData = { ...sample, ctd_latitude: -22.45717, ctd_longitude: -43.15433 };

const renderTab = (props: { sample?: SampleData; project?: Project; onSampleUpdated?: (s: SampleData) => void } = {}) =>
    render(
        <SampleMetadataTab
            projectId={7}
            project={props.project}
            sample={props.sample ?? sample}
            onSampleUpdated={props.onSampleUpdated ?? vi.fn()}
        />,
    );

describe("SampleMetadataTab", () => {
    beforeEach(() => {
        vi.mocked(selectSampleCoordinates).mockReset();
    });

    it("shows the imported metadata in read-only fields", () => {
        renderTab();

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
        const { unmount } = renderTab({ project });
        expect(screen.getByLabelText("Name")).toHaveValue("Jane Doe");
        unmount();

        renderTab({ project: { ...project, operator_email: "other@example.org" } });
        expect(screen.getByLabelText("Name")).toHaveValue("—");
    });

    it("uses the metadata location and disables the CTD one when the sample has no CTD coordinates", () => {
        renderTab();

        expect(screen.getByRole("radio", { name: "Location from imported metadata" })).toBeChecked();
        const ctdRadio = screen.getByRole("radio", { name: "Location from imported CTD file" });
        expect(ctdRadio).not.toBeChecked();
        expect(ctdRadio).toBeDisabled();
        expect(screen.getByText("No CTD file imported for this sample")).toBeInTheDocument();
        expect(screen.getAllByLabelText("Latitude")[0]).toHaveValue("-33.45717");

        expect(screen.getByTestId("location-map")).toHaveTextContent("metadata");
        expect(screen.getByTestId("location-map")).not.toHaveTextContent("ctd");
    });

    it("tells when the imported CTD file has no position (e.g. UVP5)", () => {
        renderTab({ sample: { ...sample, ctd_imported: true } });

        expect(screen.getByRole("radio", { name: "Location from imported CTD file" })).toBeDisabled();
        expect(screen.getByText("The imported CTD file has no position")).toBeInTheDocument();
    });

    it("puts the CTD location on the map and checks it when it is the selected one", () => {
        renderTab({ sample: { ...sampleWithCtd, use_ctd_coordinates: true } });

        expect(screen.getByRole("radio", { name: "Location from imported CTD file" })).toBeChecked();
        expect(screen.getByRole("radio", { name: "Location from imported metadata" })).not.toBeChecked();
        expect(screen.getAllByLabelText("Latitude")[1]).toHaveValue("-22.45717");
        expect(screen.getByTestId("location-map")).toHaveTextContent("ctd");
    });

    it("selects the CTD location through the backend and hands back the updated sample", async () => {
        const updated = { ...sampleWithCtd, use_ctd_coordinates: true };
        vi.mocked(selectSampleCoordinates).mockResolvedValue(updated);
        const onSampleUpdated = vi.fn();
        renderTab({ sample: sampleWithCtd, onSampleUpdated });

        // A click anywhere on the option card selects it.
        await userEvent.click(screen.getByText("Location from imported CTD file"));

        expect(selectSampleCoordinates).toHaveBeenCalledExactlyOnceWith(7, 1, true);
        await waitFor(() => expect(onSampleUpdated).toHaveBeenCalledWith(updated));
    });

    it("does not call the backend when the selected location is clicked again", async () => {
        renderTab({ sample: sampleWithCtd });

        await userEvent.click(screen.getByRole("radio", { name: "Location from imported metadata" }));

        expect(selectSampleCoordinates).not.toHaveBeenCalled();
    });

    it("shows the backend error when the update fails", async () => {
        vi.mocked(selectSampleCoordinates).mockRejectedValue(new Error("Logged user cannot update samples in this project"));
        const onSampleUpdated = vi.fn();
        renderTab({ sample: { ...sampleWithCtd, use_ctd_coordinates: true }, onSampleUpdated });

        await userEvent.click(screen.getByRole("radio", { name: "Location from imported metadata" }));

        expect(await screen.findByText(/Logged user cannot update samples in this project/)).toBeInTheDocument();
        expect(selectSampleCoordinates).toHaveBeenCalledWith(7, 1, false);
        expect(onSampleUpdated).not.toHaveBeenCalled();
    });
});
