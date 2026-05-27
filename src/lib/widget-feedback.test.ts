import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyPendingWidgetFeedback } from "@/lib/widget-feedback";

vi.mock("@/lib/widget", () => ({
  readFeedbackAction: vi.fn(),
  clearFeedbackAction: vi.fn(),
  readWidgetThermalSensitivity: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  upsertCalibration: vi.fn(),
}));

import { readFeedbackAction, clearFeedbackAction, readWidgetThermalSensitivity } from "@/lib/widget";
import { upsertCalibration } from "@/lib/supabase";
import { useAppStore } from "@/store";
import { DEFAULT_CALIBRATION } from "@/lib/outfit-logic";

describe("applyPendingWidgetFeedback", () => {
  beforeEach(() => {
    vi.mocked(readFeedbackAction).mockReset();
    vi.mocked(clearFeedbackAction).mockReset();
    vi.mocked(readWidgetThermalSensitivity).mockReset();
    vi.mocked(upsertCalibration).mockReset();
    useAppStore.setState({
      calibration: { ...DEFAULT_CALIBRATION, user_id: "u1" },
    });
  });

  it("does not clear feedback when calibration is missing", async () => {
    vi.mocked(readFeedbackAction).mockResolvedValue("too_cold");
    vi.mocked(readWidgetThermalSensitivity).mockResolvedValue(null);
    useAppStore.setState({ calibration: null });

    const result = await applyPendingWidgetFeedback("u1");

    expect(result).toBe(false);
    expect(clearFeedbackAction).not.toHaveBeenCalled();
  });

  it("clears feedback only after successful save", async () => {
    vi.mocked(readFeedbackAction).mockResolvedValue("too_cold");
    vi.mocked(readWidgetThermalSensitivity).mockResolvedValue(null);
    vi.mocked(upsertCalibration).mockResolvedValue(null);

    const result = await applyPendingWidgetFeedback("u1");

    expect(result).toBe(false);
    expect(clearFeedbackAction).not.toHaveBeenCalled();
  });
});
