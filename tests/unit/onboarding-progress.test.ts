import { describe, expect, it } from "vitest";

import { getOnboardingResumePath } from "@/lib/onboarding/progress";

describe("onboarding resume path", () => {
  it("keeps incomplete registration in account setup", () => {
    expect(getOnboardingResumePath({ activeCycleCount: 0, hasUsername: false, protocolCount: 0 })).toBe("/account/register");
  });

  it("resumes site setup before the first protocol", () => {
    expect(getOnboardingResumePath({ activeCycleCount: 0, hasUsername: true, protocolCount: 0 })).toBe("/onboarding/sites");
  });

  it("resumes at cycles when protocols are already saved", () => {
    expect(getOnboardingResumePath({ activeCycleCount: 0, hasUsername: true, protocolCount: 2 })).toBe("/onboarding/cycles");
  });

  it("continues to the dashboard when an active cycle exists", () => {
    expect(getOnboardingResumePath({ activeCycleCount: 2, hasUsername: true, protocolCount: 2 })).toBe("/dashboard");
  });
});
