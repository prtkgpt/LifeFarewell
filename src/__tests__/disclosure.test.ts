import { describe, it, expect } from "vitest";
import {
  getEmailDisclosure,
  getSmsDisclosure,
  getCallDisclosure,
  enforceDisclosure,
  validateDisclosurePresent,
} from "@/lib/disclosure/templates";

describe("Disclosure Templates", () => {
  describe("getEmailDisclosure", () => {
    it("should include LifeFarewell and contact name in FULL mode", () => {
      const disclosure = getEmailDisclosure({
        mode: "FULL",
        contactFirstName: "Sarah",
      });
      expect(disclosure).toContain("LifeFarewell");
      expect(disclosure).toContain("Sarah");
      expect(disclosure).toContain("assistant");
    });

    it("should use fallback name when contactFirstName is null in FULL mode", () => {
      const disclosure = getEmailDisclosure({
        mode: "FULL",
        contactFirstName: null,
      });
      expect(disclosure).toContain("a family member");
    });

    it("should not include LifeFarewell in MINIMAL mode", () => {
      const disclosure = getEmailDisclosure({
        mode: "MINIMAL",
        contactFirstName: "Sarah",
      });
      expect(disclosure).not.toContain("LifeFarewell");
      expect(disclosure).toContain("assisting");
    });

    it("should always disclose assistance in MINIMAL mode", () => {
      const disclosure = getEmailDisclosure({
        mode: "MINIMAL",
      });
      expect(disclosure).toContain("assisting");
      expect(disclosure).toContain("family");
    });
  });

  describe("getSmsDisclosure", () => {
    it("should include contact name in FULL mode", () => {
      const disclosure = getSmsDisclosure({
        mode: "FULL",
        contactFirstName: "John",
      });
      expect(disclosure).toContain("John");
      expect(disclosure).toContain("LifeFarewell");
    });

    it("should be concise in MINIMAL mode", () => {
      const disclosure = getSmsDisclosure({
        mode: "MINIMAL",
      });
      expect(disclosure).toContain("Assisting");
    });
  });

  describe("getCallDisclosure", () => {
    it("should include full disclosure for calls in FULL mode", () => {
      const disclosure = getCallDisclosure({
        mode: "FULL",
        contactFirstName: "Maria",
      });
      expect(disclosure).toContain("Maria");
      expect(disclosure).toContain("LifeFarewell");
      expect(disclosure).toContain("assistant");
    });

    it("should disclose assistance in MINIMAL mode", () => {
      const disclosure = getCallDisclosure({
        mode: "MINIMAL",
      });
      expect(disclosure).toContain("assisting");
    });
  });

  describe("enforceDisclosure", () => {
    it("should prepend disclosure if not already present", () => {
      const body = "Hello, I would like to inquire about services.";
      const disclosure = "I am an assistant from LifeFarewell.";
      const result = enforceDisclosure(body, disclosure);
      expect(result).toContain(disclosure);
      expect(result).toContain(body);
      expect(result.indexOf(disclosure)).toBeLessThan(result.indexOf(body));
    });

    it("should not duplicate disclosure if already present", () => {
      const disclosure = "I am an assistant from LifeFarewell.";
      const body = `${disclosure}\n\nHello, I would like to inquire.`;
      const result = enforceDisclosure(body, disclosure);
      expect(result).toBe(body);
    });
  });

  describe("validateDisclosurePresent", () => {
    it("should validate FULL disclosure contains required terms", () => {
      const text =
        "I'm an assistant from LifeFarewell, contacting you on behalf of Sarah.";
      expect(validateDisclosurePresent(text, "FULL")).toBe(true);
    });

    it("should reject FULL disclosure without required terms", () => {
      const text = "Hello, I would like to book a service.";
      expect(validateDisclosurePresent(text, "FULL")).toBe(false);
    });

    it("should validate MINIMAL disclosure contains assisting reference", () => {
      const text = "I'm assisting the family coordinating arrangements.";
      expect(validateDisclosurePresent(text, "MINIMAL")).toBe(true);
    });

    it("should reject MINIMAL disclosure without assisting reference", () => {
      const text = "I need to book a funeral service please.";
      expect(validateDisclosurePresent(text, "MINIMAL")).toBe(false);
    });
  });
});
