export type MemberProtocolActionState = {
  message?: string;
  status: "idle" | "error";
};

export const initialMemberProtocolActionState: MemberProtocolActionState = { status: "idle" };
