import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";

import AboutPage from "@/features/about/pages/AboutPage";
import { PARTNERS } from "@/features/about/content";
import { renderWithRouter } from "@/test/utils";

const BOAT_ALT = "Research vessel deploying an instrument at sea";

describe("AboutPage", () => {
    beforeEach(() => {
        // JSDOM has no canvas: keep the hero's particle field silent (it bails
        // out on a null context) instead of logging "not implemented".
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => null);
    });

    it("renders every section under the page title", () => {
        renderWithRouter(<AboutPage />, { route: "/about" });

        expect(screen.getByRole("heading", { level: 1, name: "About EcoPart" })).toBeInTheDocument();
        for (const name of [
            "Create, check and share your data",
            "Explore, share and export aggregated dataset",
            "Institutions and projects that make it possible",
            "Data from multiple sources",
            "An easy way to handle your UVP data",
        ]) {
            expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
        }
    });

    it("sends 'Explore data' to the explore page", () => {
        renderWithRouter(<AboutPage />, { route: "/about" });

        expect(screen.getByRole("link", { name: "Explore data" })).toHaveAttribute("href", "/explore");
    });

    it("shows one logo per partner, named for screen readers", () => {
        renderWithRouter(<AboutPage />, { route: "/about" });

        for (const { name } of PARTNERS) {
            expect(screen.getByRole("img", { name })).toBeInTheDocument();
        }
    });

    it("opens every outside link in a new tab without handing over the opener", () => {
        renderWithRouter(<AboutPage />, { route: "/about" });

        const outside = screen.getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("http"));
        expect(outside.length).toBeGreaterThan(0);
        for (const link of outside) {
            expect(link).toHaveAttribute("target", "_blank");
            expect(link).toHaveAttribute("rel", "noopener noreferrer");
        }
    });

    it("keeps a named placeholder in place of a photo that fails to load", () => {
        renderWithRouter(<AboutPage />, { route: "/about" });

        const photo = screen.getByRole("img", { name: BOAT_ALT });
        expect(photo.tagName).toBe("IMG");

        fireEvent.error(photo);

        const placeholder = screen.getByRole("img", { name: BOAT_ALT });
        expect(placeholder.tagName).not.toBe("IMG");
    });
});
