import { describe, expect, it } from "vitest";
import documents from "./documents.json";

describe("DLTC reference resources", () => {
  it("provides secure, absolute links for every listed resource", () => {
    expect(documents).toHaveLength(10);

    for (const document of documents) {
      const url = new URL(document.url);
      expect(url.protocol, document.name).toBe("https:");
      expect(["www.natis.gov.za", "www.k53rsa.co.za"]).toContain(url.hostname);
    }
  });

  it("does not expose retired asset-proxy paths", () => {
    for (const document of documents) {
      expect(document.url).not.toContain("/__l5e/assets-v1/");
    }
  });
});
