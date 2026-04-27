import { describe, expect, it } from "vitest";

describe("Auth Handlers", () => {
  describe("Auth handlers export", () => {
    it("should export authHandlers array", async () => {
      const { authHandlers } = await import("./auth-handlers");
      expect(Array.isArray(authHandlers)).toBe(true);
      expect(authHandlers.length).toBeGreaterThan(0);
    });
  });
});
