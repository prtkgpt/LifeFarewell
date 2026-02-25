import { describe, it, expect } from "vitest";

// Test approval gating logic
// In the real app, this is enforced in the OutreachAgent
// Here we test the pure logic

type ApprovalLevel =
  | "LEVEL_1_REVIEW_ALL"
  | "LEVEL_2_AUTO_OUTREACH"
  | "LEVEL_3_AUTO_EXECUTE_LIMITED";

type ActionType =
  | "initial_outreach"
  | "follow_up"
  | "booking_request"
  | "payment_request"
  | "commitment";

function requiresApproval(
  level: ApprovalLevel,
  actionType: ActionType
): boolean {
  switch (level) {
    case "LEVEL_1_REVIEW_ALL":
      // Everything requires approval
      return true;

    case "LEVEL_2_AUTO_OUTREACH":
      // Auto-send initial outreach and follow-ups
      // Require approval for bookings, payments, commitments
      if (
        actionType === "initial_outreach" ||
        actionType === "follow_up"
      ) {
        return false;
      }
      return true;

    case "LEVEL_3_AUTO_EXECUTE_LIMITED":
      // For MVP, treat same as LEVEL_2 but allow booking within constraints
      // Still require approval for payments and commitments
      if (
        actionType === "payment_request" ||
        actionType === "commitment"
      ) {
        return true;
      }
      return false;

    default:
      return true; // Default to requiring approval
  }
}

describe("Approval Gating", () => {
  describe("LEVEL_1_REVIEW_ALL", () => {
    const level: ApprovalLevel = "LEVEL_1_REVIEW_ALL";

    it("should require approval for initial outreach", () => {
      expect(requiresApproval(level, "initial_outreach")).toBe(true);
    });

    it("should require approval for follow ups", () => {
      expect(requiresApproval(level, "follow_up")).toBe(true);
    });

    it("should require approval for booking requests", () => {
      expect(requiresApproval(level, "booking_request")).toBe(true);
    });

    it("should require approval for payment requests", () => {
      expect(requiresApproval(level, "payment_request")).toBe(true);
    });

    it("should require approval for commitments", () => {
      expect(requiresApproval(level, "commitment")).toBe(true);
    });
  });

  describe("LEVEL_2_AUTO_OUTREACH", () => {
    const level: ApprovalLevel = "LEVEL_2_AUTO_OUTREACH";

    it("should NOT require approval for initial outreach", () => {
      expect(requiresApproval(level, "initial_outreach")).toBe(false);
    });

    it("should NOT require approval for follow ups", () => {
      expect(requiresApproval(level, "follow_up")).toBe(false);
    });

    it("should require approval for booking requests", () => {
      expect(requiresApproval(level, "booking_request")).toBe(true);
    });

    it("should require approval for payment requests", () => {
      expect(requiresApproval(level, "payment_request")).toBe(true);
    });

    it("should require approval for commitment language", () => {
      expect(requiresApproval(level, "commitment")).toBe(true);
    });
  });

  describe("LEVEL_3_AUTO_EXECUTE_LIMITED", () => {
    const level: ApprovalLevel = "LEVEL_3_AUTO_EXECUTE_LIMITED";

    it("should NOT require approval for initial outreach", () => {
      expect(requiresApproval(level, "initial_outreach")).toBe(false);
    });

    it("should NOT require approval for booking requests", () => {
      expect(requiresApproval(level, "booking_request")).toBe(false);
    });

    it("should still require approval for payment requests", () => {
      expect(requiresApproval(level, "payment_request")).toBe(true);
    });

    it("should still require approval for commitment language", () => {
      expect(requiresApproval(level, "commitment")).toBe(true);
    });
  });
});
