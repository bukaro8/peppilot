import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  execute: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getDatabase: () => ({ execute: databaseMocks.execute }),
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    databaseMocks.execute.mockReset();
  });

  it("reports healthy when PostgreSQL responds", async () => {
    databaseMocks.execute.mockResolvedValueOnce([]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("reports unhealthy when PostgreSQL fails", async () => {
    databaseMocks.execute.mockRejectedValueOnce(new Error("connection unavailable"));

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unhealthy" });
  });
});
