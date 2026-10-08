import { describe, expect, it } from "vitest";

import { renderWithRouter } from "@/test/utils";
import HomePage from "./HomePage";

/** Every CSS rule emotion generated for the element's `css-…` class, as text. */
const rulesFor = (element: Element): string[] => {
    const cls = Array.from(element.classList).find((c) => c.startsWith("css-"));
    return Array.from(document.styleSheets)
        .flatMap((sheet) => Array.from(sheet.cssRules).map((rule) => rule.cssText))
        .filter((text) => cls !== undefined && text.includes(cls));
};

describe("HomePage", () => {
    it("cancels the compact layout padding exactly, so the hero does not overlap the TopBar", () => {
        const { container } = renderWithRouter(<HomePage />);
        const ruleList = rulesFor(container.firstElementChild as Element);
        const rules = ruleList.join("\n");

        // Large screens: the 24px layout padding, below a 64px TopBar.
        expect(rules).toMatch(/margin(-top)?: -24px/);
        expect(rules).toMatch(/min-height: calc\(100vh - 64px\)/);
        // Compact screens: the 12px padding and the 52px TopBar. Both live in the same media query,
        // which an object spread used to collapse, keeping only the second one.
        const compact = ruleList.filter((rule) => rule.includes("max-width: 1599.95px")).join("\n");
        expect(compact).toMatch(/margin(-top)?: -12px/);
        expect(compact).toMatch(/min-height: calc\(100vh - 52px\)/);
    });
});
