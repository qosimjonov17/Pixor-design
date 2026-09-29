export type Platform = "x" | "behance" | "dprofile" | "dribbble";

export type PlatformInfo = {
  id: Platform;
  label: string;
  icon: string;
};

export const PLATFORMS: PlatformInfo[] = [
  { id: "x", label: "X", icon: "/icons/x.svg" },
  { id: "behance", label: "Behance", icon: "/icons/behance.svg" },
  { id: "dprofile", label: "Dprofile", icon: "/icons/dprofile.png" },
  { id: "dribbble", label: "Dribbble", icon: "/icons/dribbble.svg" },
];

export function getPlatform(id: Platform): PlatformInfo {
  return PLATFORMS.find((p) => p.id === id)!;
}

export function isPlatform(value: unknown): value is Platform {
  return typeof value === "string" && PLATFORMS.some((p) => p.id === value);
}

/** "Behanceda ko'rish", "Xda ko'rish" ... */
export function viewOnLabel(id: Platform): string {
  return `${getPlatform(id).label}da ko’rish`;
}
