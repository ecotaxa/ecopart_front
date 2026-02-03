import "@testing-library/jest-dom";
import { beforeAll, afterEach, afterAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./msw/server";
import { resetMockAuth } from "./msw/handlers"; // Import the reset function

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