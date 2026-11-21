export type ProfileActionState = {
  status: "idle" | "error" | "success";
  field?: "username" | "displayName" | "bio" | "communityAnalyticsEnabled";
  message?: string;
};

export const initialProfileActionState: ProfileActionState = { status: "idle" };
