import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/test/utils";
import { answerConfirmDialogs } from "@/test/helpers/confirm.helpers";
import type { LocationMapProps } from "@/shared/components/map";
import {
    getEcoTaxaSampleStats, getSampleQcGraphs, setSampleVisualQc,
    type SampleData, type SampleQcGraphs,
} from "../api/projects.api";
import { SampleQualityChecksTab } from "./SampleQualityChecksTab";

// jsdom has no WebGL: replace the map by a list of the locations it receives.
vi.mock("@/shared/components/map", () => ({
    LocationMap: ({ locations }: LocationMapProps) => (
        <ul data-testid="location-map">
            {locations.map((location) => <li key={location.id}>{location.id}</li>)}
        </ul>
    ),
}));

// The graphs themselves are covered by QcSampleCard.test.tsx.
vi.mock("./QcSampleCard", () => ({
    QcSampleGraphs: ({ sample }: { sample: SampleQcGraphs }) => <div>graphs of {sample.sample_name}</div>,
}));

vi.mock("../api/projects.api", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../api/projects.api")>()),
    getSampleQcGraphs: vi.fn(),
    getEcoTaxaSampleStats: vi.fn(),
    setSampleVisualQc: vi.fn(),
}));

const validatedSample: SampleData = {
    sample_id: 9,
    sample_name: "tara_093_00_a",
    station_id: "tara_093_00_a",
    latitude: -22.1224,
    longitude: -82.15433,
    ctd_latitude: -22.1224,
    ctd_longitude: -82.15433,
    use_ctd_coordinates: false,
    visual_qc_status_label: "VALIDATED",
    visual_qc_validation_utc_date_time: "2022-12-05T15:14:44.000Z",
    visual_qc_validator_user: "Coustenoble Julie (coustenoble.julie@imev-mer.fr)",
    visual_qc_validator_email: "coustenoble.julie@imev-mer.fr",
    ecotaxa_sample_imported: true,
    ecotaxa_sample_id: 4242,
};

const pendingSample: SampleData = {
    ...validatedSample,
    visual_qc_status_label: "PENDING",
    visual_qc_validation_utc_date_time: null,
    visual_qc_validator_user: null,
    visual_qc_validator_email: null,
};

const renderTab = (sample: SampleData, onSampleUpdated = vi.fn()) => ({
    onSampleUpdated,
    ...renderWithRouter(<SampleQualityChecksTab projectId={555} sample={sample} onSampleUpdated={onSampleUpdated} />),
});

describe("SampleQualityChecksTab", () => {
    beforeEach(() => {
        vi.mocked(getSampleQcGraphs).mockReset().mockResolvedValue({ sample_name: "tara_093_00_a" } as SampleQcGraphs);
        vi.mocked(getEcoTaxaSampleStats).mockReset().mockResolvedValue({
            sample_id: 9,
            sample_name: "tara_093_00_a",
            ecotaxa_sample_id: 4242,
            nb_objects: 100,
            nb_validated: 50,
            nb_predicted: 25,
            nb_unclassified: 25,
            nb_dubious: 0,
        });
        vi.mocked(setSampleVisualQc).mockReset();
    });

    it("shows who validated the QC, the graphs, both positions and the classification", async () => {
        renderTab(validatedSample);

        expect(screen.getByLabelText("Visual QC status")).toHaveValue("Validated");
        expect(screen.getByLabelText("UTC date time")).toHaveValue("2022-12-05 15:14:44");
        expect(screen.getByLabelText("Validated by")).toHaveValue("Coustenoble Julie");
        expect(screen.getByLabelText("Email")).toHaveValue("coustenoble.julie@imev-mer.fr");
        expect(screen.queryByRole("button", { name: /validate qc/i })).not.toBeInTheDocument();

        expect(await screen.findByText("graphs of tara_093_00_a")).toBeInTheDocument();
        expect(getSampleQcGraphs).toHaveBeenCalledWith(555, 9);

        expect(screen.getByLabelText("Station ID")).toHaveValue("tara_093_00_a");
        expect(screen.getByLabelText("Sample Latitude")).toHaveValue("-22.1224");
        expect(screen.getByLabelText("CTD Latitude")).toHaveValue("-22.1224");
        // The CTD position is not the one used by the sample.
        expect(screen.getByLabelText("CTD Latitude")).toBeDisabled();
        expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["metadata", "ctd"]);

        expect(await screen.findByRole("progressbar", { name: "Validated objects: 50%" })).toBeInTheDocument();
        expect(screen.getByRole("progressbar", { name: "Predicted objects: 25%" })).toBeInTheDocument();
        expect(screen.getByRole("progressbar", { name: "Unclassified objects: 25%" })).toBeInTheDocument();
        expect(screen.getByText(/classification uncompleted/i)).toBeInTheDocument();
    });

    it("shows dashes for the CTD position when no CTD file is imported", () => {
        renderTab({ ...validatedSample, ctd_latitude: null, ctd_longitude: null });

        expect(screen.getByLabelText("CTD Latitude")).toHaveValue("—");
        expect(screen.getByLabelText("CTD Longitude")).toHaveValue("—");
        expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["metadata"]);
    });

    it("validates a pending QC after confirmation", async () => {
        const updated = { ...validatedSample };
        vi.mocked(setSampleVisualQc).mockResolvedValue(updated);
        answerConfirmDialogs(true);
        const { onSampleUpdated } = renderTab(pendingSample);

        expect(screen.getByLabelText("Visual QC status")).toHaveValue("Pending");
        expect(screen.queryByLabelText("Validated by")).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: /validate qc/i }));

        await waitFor(() => expect(onSampleUpdated).toHaveBeenCalledWith(updated));
        expect(setSampleVisualQc).toHaveBeenCalledWith(555, 9, "VALIDATED");
    });

    it("keeps the QC pending when the validation is cancelled", async () => {
        answerConfirmDialogs(false);
        renderTab(pendingSample);

        await userEvent.click(screen.getByRole("button", { name: /validate qc/i }));

        expect(setSampleVisualQc).not.toHaveBeenCalled();
    });

    it("does not query EcoTaxa for a sample that is not imported there", () => {
        renderTab({ ...validatedSample, ecotaxa_sample_imported: false, ecotaxa_sample_id: null });

        expect(screen.getByText("This sample is not imported in EcoTaxa.")).toBeInTheDocument();
        expect(getEcoTaxaSampleStats).not.toHaveBeenCalled();
    });
});
