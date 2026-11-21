export function getOnboardingResumePath({
  activeCycleCount,
  hasUsername,
  protocolCount,
}: {
  activeCycleCount: number;
  hasUsername: boolean;
  protocolCount: number;
}) {
  if (!hasUsername) return "/account/register";
  if (protocolCount === 0) return "/onboarding/sites";
  if (activeCycleCount === 0) return "/onboarding/cycles";
  return "/dashboard";
}
