import { redirect } from "next/navigation";

import { requireCompletedProfile } from "@/lib/auth/session";
import { getMemberProtocols } from "@/lib/member-protocol/service";
import { getOnboardingResumePath } from "@/lib/onboarding/progress";
import { getProtocolCycles } from "@/lib/protocol-cycle/service";

export default async function OnboardingPage() {
  const { actor, profile } = await requireCompletedProfile();
  const [protocols, cycles] = await Promise.all([
    getMemberProtocols(actor),
    getProtocolCycles(actor),
  ]);
  redirect(getOnboardingResumePath({
    activeCycleCount: cycles.filter((cycle) => cycle.status === "active" || cycle.status === "paused").length,
    hasUsername: Boolean(profile.username),
    protocolCount: protocols.length,
  }));
}
