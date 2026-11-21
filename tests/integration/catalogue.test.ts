import { afterAll, beforeAll, describe, expect, it } from "vitest";

type SqlClient = ReturnType<(typeof import("@/lib/db"))["getPostgresClient"]>;

let catalogueService: typeof import("@/lib/catalogue/service");
let sql: SqlClient;

beforeAll(async () => {
  process.env.DATABASE_URL ??=
    "postgresql://peppilot:peppilot_dev_only@database:5432/peppilot";
  const database = await import("@/lib/db");
  sql = database.getPostgresClient();
  catalogueService = await import("@/lib/catalogue/service");
});

afterAll(async () => {
  await sql.end();
});

describe("catalogue queries", () => {
  it("returns the 16 active catalogue entries", async () => {
    const entries = await catalogueService.getCatalogueEntries();
    expect(entries).toHaveLength(16);
    expect(entries.every((entry) => entry.isActive)).toBe(true);
  });

  it("searches names, descriptions and tracking focus", async () => {
    await expect(catalogueService.getCatalogueEntries({ query: "NAD+" })).resolves.toMatchObject([
      { slug: "nad-plus", kind: "tracked_compound" },
    ]);
    await expect(catalogueService.getCatalogueEntries({ query: "waist" })).resolves.toMatchObject([
      { slug: "tesamorelin" },
    ]);
  });

  it("filters by approved category", async () => {
    const entries = await catalogueService.getCatalogueEntries({ category: "weight_management" });
    expect(entries).toHaveLength(4);
    expect(entries.every((entry) => entry.category === "weight_management")).toBe(true);
  });

  it("returns ordered blend ingredients and hides inactive entries", async () => {
    await expect(catalogueService.getCatalogueEntryBySlug("WOLVERINE-BLEND")).resolves.toMatchObject({
      slug: "wolverine-blend",
      ingredients: [{ displayName: "BPC-157" }, { displayName: "TB-500" }],
    });
    await expect(
      catalogueService.getCatalogueEntryBySlug("cjc-1295-no-dac-ipamorelin"),
    ).resolves.toMatchObject({
      ingredients: [{ displayName: "CJC-1295 (no DAC)" }, { displayName: "Ipamorelin" }],
    });
    await expect(catalogueService.getCatalogueEntryBySlug("klow")).resolves.toMatchObject({
      ingredients: [
        { displayName: "GHK-Cu" },
        { displayName: "BPC-157" },
        { displayName: "TB-500" },
        { displayName: "KPV" },
      ],
    });

    await sql`update catalogue_entry set is_active = false where slug = 'selank'`;
    await expect(catalogueService.getCatalogueEntryBySlug("selank")).resolves.toBeNull();
    await sql`update catalogue_entry set is_active = true where slug = 'selank'`;
  });
});
