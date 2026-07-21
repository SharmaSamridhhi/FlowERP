import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest doesn't auto-cleanup the DOM between tests the way Jest's RTL
// integration does by default — without this, each render() in a file
// accumulates in the DOM and later queries in the same file can match
// multiple elements.
afterEach(() => {
  cleanup();
});
