import "@testing-library/jest-dom";
import { beforeAll, afterEach, afterAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./msw/server";
import { resetMockAuth } from "./msw/handlers"; // Import the reset function

const originalConsoleError = console.error;

// Filter only the noisy React act() warning that is common with MUI async internals in tests.
console.error = (...args: unknown[]) => {
    const first = typeof args[0] === "string" ? args[0] : "";
    if (first.includes("not wrapped in act")) {
        return;
    }
    originalConsoleError(...args);
};

// JSDOM does not implement layout; provide stable non-zero boxes for MUI Popover/Menu anchors.
Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value: function () {
        return {
            width: 100,
            height: 40,
            top: 0,
            left: 0,
            right: 100,
            bottom: 40,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        };
    },
});

// Start the interception server before all tests
beforeAll(() => server.listen());

// Reset handlers and cleanup DOM after each test to ensure isolation
afterEach(() => {
    server.resetHandlers();
    resetMockAuth(); // Reset the fake server login state
    cleanup();
});

// Close the server when all tests are done
afterAll(() => server.close());
/**
 * This guarantees:
➡️ No test pollutes others.
➡️ No persistent state.
➡️ Fully simulated network requests.
 */