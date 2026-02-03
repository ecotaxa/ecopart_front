import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// Setup the server with the defined handlers
export const server = setupServer(...handlers);