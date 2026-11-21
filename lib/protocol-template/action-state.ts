export type ProtocolTemplateActionState = {
  message?: string;
  status: "error" | "idle" | "success";
};

export const initialProtocolTemplateActionState: ProtocolTemplateActionState = { status: "idle" };
