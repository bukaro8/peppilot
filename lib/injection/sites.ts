export const injectionSites = [
  {
    id: "abdomen_left_upper",
    zone: 1,
    region: "Abdomen",
    subzone: "Left upper",
    view: "front",
  },
  {
    id: "abdomen_left_lower",
    zone: 1,
    region: "Abdomen",
    subzone: "Left lower",
    view: "front",
  },
  {
    id: "abdomen_right_upper",
    zone: 1,
    region: "Abdomen",
    subzone: "Right upper",
    view: "front",
  },
  {
    id: "abdomen_right_lower",
    zone: 1,
    region: "Abdomen",
    subzone: "Right lower",
    view: "front",
  },
  {
    id: "love_handle_left",
    zone: 2,
    region: "Love handles",
    subzone: "Left",
    view: "front",
  },
  {
    id: "love_handle_right",
    zone: 2,
    region: "Love handles",
    subzone: "Right",
    view: "front",
  },
  {
    id: "thigh_left_upper",
    zone: 3,
    region: "Thighs",
    subzone: "Left upper",
    view: "front",
  },
  {
    id: "thigh_left_lower",
    zone: 3,
    region: "Thighs",
    subzone: "Left lower",
    view: "front",
  },
  {
    id: "thigh_right_upper",
    zone: 3,
    region: "Thighs",
    subzone: "Right upper",
    view: "front",
  },
  {
    id: "thigh_right_lower",
    zone: 3,
    region: "Thighs",
    subzone: "Right lower",
    view: "front",
  },
  {
    id: "upper_arm_left",
    zone: 4,
    region: "Upper arms",
    subzone: "Left",
    view: "rear",
  },
  {
    id: "upper_arm_right",
    zone: 4,
    region: "Upper arms",
    subzone: "Right",
    view: "rear",
  },
  {
    id: "upper_buttock_left",
    zone: 5,
    region: "Upper buttocks",
    subzone: "Left",
    view: "rear",
  },
  {
    id: "upper_buttock_right",
    zone: 5,
    region: "Upper buttocks",
    subzone: "Right",
    view: "rear",
  },
] as const;

export type InjectionSiteId = (typeof injectionSites)[number]["id"];

const sitesById = new Map(injectionSites.map((site) => [site.id, site]));

export function isInjectionSiteId(value: string): value is InjectionSiteId {
  return sitesById.has(value as InjectionSiteId);
}

export function getInjectionSite(value: string | null | undefined) {
  return value && isInjectionSiteId(value)
    ? (sitesById.get(value) ?? null)
    : null;
}

export function formatInjectionSite(value: string | null | undefined) {
  const site = getInjectionSite(value);
  return site
    ? `Zone ${site.zone} — ${site.region} · ${site.subzone}`
    : "Site unspecified";
}

export function formatAnatomicalInjectionSite(
  value: string | null | undefined,
) {
  const site = getInjectionSite(value);
  if (!site) return "Site unspecified";
  if (site.id.startsWith("abdomen_")) {
    const [side, position] = site.subzone.toLowerCase().split(" ");
    return `${position[0].toUpperCase()}${position.slice(1)}-${side} abdomen`;
  }
  if (site.id.startsWith("love_handle_")) return `${site.subzone} flank`;
  if (site.id.startsWith("thigh_")) {
    const [side, position] = site.subzone.toLowerCase().split(" ");
    return `${position[0].toUpperCase()}${position.slice(1)}-${side} thigh`;
  }
  if (site.id.startsWith("upper_arm_")) return `${site.subzone} upper arm`;
  return `${site.subzone} buttock`;
}
