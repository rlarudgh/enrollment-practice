import { setupWorker } from "msw/browser";
import { authHandlers, handlers } from "./handlers";

export const worker = setupWorker(...handlers, ...authHandlers);
