import { describe, expect, it } from "vitest";
import { generateLinkId } from "./fileMetadataService.js";

describe("generateLinkId", () => {
  it("generates short URL-safe IDs", () => {
    expect(generateLinkId()).toMatch(/^[A-Za-z0-9_-]{12}$/);
  });
});
