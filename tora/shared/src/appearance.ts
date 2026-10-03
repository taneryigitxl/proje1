export const BODY_TYPES = ["female", "male"] as const;
export type BodyType = (typeof BODY_TYPES)[number];

export const HAIR_STYLES = ["short", "long", "tied"] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];

export const HAIR_COLORS = [
  { id: "brown", label: "Kahverengi", hex: "#3b2416" },
  { id: "black", label: "Siyah", hex: "#1c1c1c" },
  { id: "blonde", label: "Sarı", hex: "#d7b15a" },
  { id: "auburn", label: "Kızıl", hex: "#8f3d32" },
  { id: "silver", label: "Gümüş", hex: "#cfc6be" },
] as const;

export type HairColorId = (typeof HAIR_COLORS)[number]["id"];

export function isBodyType(value: string): value is BodyType {
  return (BODY_TYPES as readonly string[]).includes(value);
}

export function isHairStyle(value: string): value is HairStyle {
  return (HAIR_STYLES as readonly string[]).includes(value);
}

export function hairColorHex(value: string): string | null {
  return HAIR_COLORS.find((color) => color.hex.toLowerCase() === value.toLowerCase())?.hex ?? null;
}
