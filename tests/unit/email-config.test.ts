import { describe, expect, it } from "vitest";

import { getSmtpTransportOptions } from "@/lib/email";

describe("SMTP configuration", () => {
  it("maps the Resend SMTP settings to implicit TLS authentication", () => {
    expect(getSmtpTransportOptions({
      SMTP_HOST: "smtp.resend.com",
      SMTP_PASSWORD: "re_test_value",
      SMTP_PORT: "465",
      SMTP_SECURE: "true",
      SMTP_USER: "resend",
    })).toEqual({
      auth: { pass: "re_test_value", user: "resend" },
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      tls: { minVersion: "TLSv1.2" },
    });
  });

  it("supports unauthenticated local Mailpit without weakening validation", () => {
    expect(getSmtpTransportOptions({ SMTP_HOST: "mailpit", SMTP_PORT: "1025", SMTP_SECURE: "false" })).toMatchObject({ auth: undefined, secure: false });
    expect(() => getSmtpTransportOptions({ SMTP_HOST: "smtp.resend.com", SMTP_PORT: "465", SMTP_SECURE: "yes" })).toThrow("SMTP_SECURE");
    expect(() => getSmtpTransportOptions({ SMTP_HOST: "smtp.resend.com", SMTP_PASSWORD: "secret" })).toThrow("configured together");
  });
});
