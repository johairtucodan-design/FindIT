export const colorPresets = [
  { name: "Black", hex: "#17191C" }, { name: "White", hex: "#FFFFFF" }, { name: "Gray", hex: "#808080" },
  { name: "Silver", hex: "#C0C0C0" }, { name: "Brown", hex: "#8B5E3C" }, { name: "Red", hex: "#E53935" },
  { name: "Orange", hex: "#F57C00" }, { name: "Yellow", hex: "#FBC02D" }, { name: "Green", hex: "#2E8B57" },
  { name: "Blue", hex: "#2563EB" }, { name: "Purple", hex: "#7E57C2" }, { name: "Pink", hex: "#EC4899" },
] as const;

const namedColors: Record<string, string> = Object.fromEntries(colorPresets.map(({ name, hex }) => [name.toLowerCase(), hex]));

export function isHexColor(value: string) {
  return /^#[\da-f]{6}$/i.test(value);
}

export function colorHex(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return isHexColor(normalized) ? normalized.toUpperCase() : namedColors[normalized]?.toUpperCase() ?? null;
}

function lab(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map(channel => parseInt(channel, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  const [x, y, z] = [(.4124564 * channels[0] + .3575761 * channels[1] + .1804375 * channels[2]) / .95047, .2126729 * channels[0] + .7151522 * channels[1] + .072175 * channels[2], (.0193339 * channels[0] + .119192 * channels[1] + .9503041 * channels[2]) / 1.08883]
    .map(value => value > .008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export function colorSimilarity(left: string, right: string, tokenSimilarity: (left: string, right: string) => number) {
  const a = colorHex(left), b = colorHex(right);
  if (a && b) {
    const [l1, a1, b1] = lab(a), [l2, a2, b2] = lab(b);
    return Math.max(0, 1 - Math.hypot(l1 - l2, a1 - a2, b1 - b2) / 100);
  }
  const normalize = (value: string) => value.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const normalizedA = normalize(left), normalizedB = normalize(right);
  return normalizedA === normalizedB ? 1 : tokenSimilarity(normalizedA, normalizedB);
}
