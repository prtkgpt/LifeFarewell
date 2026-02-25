import { describe, it, expect } from "vitest";

// Test quote normalization logic
// This tests the pure parsing/normalization logic used by QuoteNormalizationAgent

interface LineItem {
  category: string;
  description: string;
  amount: number; // cents
  isRequired: boolean;
  isFlagged: boolean;
  flagReason?: string;
}

const VALID_CATEGORIES = [
  "basic_services",
  "cremation",
  "container",
  "transport",
  "permits",
  "death_certificates",
  "ceremony",
  "other",
];

function normalizeQuoteResponse(rawContent: string): {
  lineItems: LineItem[];
  totalPrice: number;
  flags: string[];
} {
  const lineItems: LineItem[] = [];
  const flags: string[] = [];
  let totalPrice = 0;

  const lines = rawContent.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    // Match patterns like "Service name: $1,234" or "Service name - $1234.56"
    const match = line.match(
      /^(.+?)[\s]*[:\-–—]\s*\$?([\d,]+(?:\.\d{2})?)/
    );
    if (!match) continue;

    const description = match[1].trim();
    const amount = Math.round(
      parseFloat(match[2].replace(/,/g, "")) * 100
    );

    const category = categorizeItem(description);
    const isRequired = !isOptionalItem(description);
    const { isFlagged, flagReason } = checkForFlags(
      description,
      amount,
      category
    );

    if (isFlagged && flagReason) {
      flags.push(flagReason);
    }

    lineItems.push({
      category,
      description,
      amount,
      isRequired,
      isFlagged,
      flagReason,
    });

    totalPrice += amount;
  }

  return { lineItems, totalPrice, flags };
}

function categorizeItem(description: string): string {
  const lower = description.toLowerCase();

  if (
    lower.includes("basic service") ||
    lower.includes("professional fee") ||
    lower.includes("staff services")
  )
    return "basic_services";
  if (lower.includes("cremation") || lower.includes("crematory"))
    return "cremation";
  if (
    lower.includes("casket") ||
    lower.includes("urn") ||
    lower.includes("container") ||
    lower.includes("vault")
  )
    return "container";
  if (
    lower.includes("transport") ||
    lower.includes("transfer") ||
    lower.includes("hearse") ||
    lower.includes("vehicle")
  )
    return "transport";
  if (lower.includes("permit") || lower.includes("filing"))
    return "permits";
  if (
    lower.includes("death certificate") ||
    lower.includes("certified cop")
  )
    return "death_certificates";
  if (
    lower.includes("ceremony") ||
    lower.includes("memorial") ||
    lower.includes("viewing") ||
    lower.includes("visitation") ||
    lower.includes("chapel") ||
    lower.includes("service fee")
  )
    return "ceremony";

  return "other";
}

function isOptionalItem(description: string): boolean {
  const lower = description.toLowerCase();
  return (
    lower.includes("optional") ||
    lower.includes("upgrade") ||
    lower.includes("premium") ||
    lower.includes("add-on") ||
    lower.includes("enhancement")
  );
}

function checkForFlags(
  description: string,
  amount: number,
  category: string
): { isFlagged: boolean; flagReason?: string } {
  // Flag items that are unusually expensive
  const thresholds: Record<string, number> = {
    basic_services: 350000, // $3,500
    cremation: 200000, // $2,000
    container: 500000, // $5,000
    transport: 100000, // $1,000
    permits: 50000, // $500
    death_certificates: 20000, // $200
    ceremony: 300000, // $3,000
    other: 150000, // $1,500
  };

  if (amount > (thresholds[category] || 150000)) {
    return {
      isFlagged: true,
      flagReason: `${description} seems unusually high at $${(amount / 100).toFixed(2)}`,
    };
  }

  // Flag uncategorized items
  if (category === "other" && amount > 50000) {
    return {
      isFlagged: true,
      flagReason: `Unrecognized fee: ${description} ($${(amount / 100).toFixed(2)})`,
    };
  }

  return { isFlagged: false };
}

describe("Quote Normalization", () => {
  it("should parse a standard vendor quote response", () => {
    const rawContent = `
Basic Services Fee: $2,195
Transfer of Remains: $395
Cremation Fee: $350
Urn - Standard: $195
Filing Permits: $75
Death Certificates (5 copies): $85
Memorial Service: $495
    `.trim();

    const result = normalizeQuoteResponse(rawContent);

    expect(result.lineItems).toHaveLength(7);
    expect(result.totalPrice).toBe(379000); // $3,790.00

    // Verify categorization
    const categories = result.lineItems.map((i) => i.category);
    expect(categories).toContain("basic_services");
    expect(categories).toContain("transport");
    expect(categories).toContain("cremation");
    expect(categories).toContain("container");
    expect(categories).toContain("permits");
    expect(categories).toContain("death_certificates");
    expect(categories).toContain("ceremony");
  });

  it("should flag unusually expensive items", () => {
    const rawContent = `
Basic Services Fee: $5,000
Cremation Fee: $350
Handling Fee: $2,000
    `.trim();

    const result = normalizeQuoteResponse(rawContent);

    // Basic services over $3,500 should be flagged
    const basicServices = result.lineItems.find(
      (i) => i.category === "basic_services"
    );
    expect(basicServices?.isFlagged).toBe(true);

    // Handling Fee is "other" category over $1,500 — should be flagged
    const handling = result.lineItems.find(
      (i) => i.description === "Handling Fee"
    );
    expect(handling?.isFlagged).toBe(true);
    expect(handling?.category).toBe("other");
  });

  it("should identify optional items", () => {
    const rawContent = `
Basic Services Fee: $2,195
Premium Casket Upgrade (optional): $1,200
Memorial Service: $495
    `.trim();

    const result = normalizeQuoteResponse(rawContent);

    const optional = result.lineItems.find((i) =>
      i.description.includes("optional")
    );
    expect(optional?.isRequired).toBe(false);

    const required = result.lineItems.find((i) =>
      i.description.includes("Basic")
    );
    expect(required?.isRequired).toBe(true);
  });

  it("should handle different price formats", () => {
    const rawContent = `
Service A - $1,234.56
Service B: $500
Service C — $2500
    `.trim();

    const result = normalizeQuoteResponse(rawContent);
    expect(result.lineItems).toHaveLength(3);
    expect(result.lineItems[0].amount).toBe(123456);
    expect(result.lineItems[1].amount).toBe(50000);
    expect(result.lineItems[2].amount).toBe(250000);
  });

  it("should return correct total price", () => {
    const rawContent = `
Fee A: $100
Fee B: $200
Fee C: $300
    `.trim();

    const result = normalizeQuoteResponse(rawContent);
    expect(result.totalPrice).toBe(60000); // $600.00
  });

  it("should validate all categories are known", () => {
    const rawContent = `
Basic Services Fee: $2,000
Cremation Fee: $350
Casket: $800
Transport: $400
Filing Permits: $75
Death Certificates: $50
Memorial Service: $500
    `.trim();

    const result = normalizeQuoteResponse(rawContent);

    for (const item of result.lineItems) {
      expect(VALID_CATEGORIES).toContain(item.category);
    }
  });
});
