// Access icons by key at runtime to avoid pulling the entire simple-icons
// namespace into the bundle as a static import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const simpleIconsModule = require("simple-icons") as Record<
  string,
  { svg: string; hex: string; title: string } | undefined
>;

export interface IconResult {
  svg: string;
  hex: string; // brand color without #
  title: string;
}

/**
 * Convert any string to a simple-icons slug format.
 * simple-icons uses camelCase keys prefixed with "si", e.g. siNetflix, siAmazonprime
 */
function toSimpleIconsKey(name: string): string {
  return (
    "si" +
    name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") // strip non-alphanumeric
      .replace(/^./, (c) => c.toUpperCase()) // capitalize first letter
  );
}

/**
 * Generate a deterministic hex color from a string (for fallback avatars).
 */
function seededColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const h = Math.abs(hash) % 360;
  // Use HSL with fixed saturation/lightness for a pleasing palette
  return hslToHex(h, 65, 50);
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `${f(0)}${f(8)}${f(4)}`;
}

/**
 * Get initials (up to 2 chars) from a service name.
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Look up a brand icon by service name.
 * Falls back to a seeded color + initials if not found.
 */
export function getServiceIcon(name: string): IconResult | null {
  if (!name) { return null; }

  // Try exact key first, then try stripping common suffixes
  const attempts = [
    name,
    name.replace(/\s+(premium|plus|pro|family|student|basic|standard|one|music|video|tv)\s*$/i, ""),
  ];

  for (const attempt of attempts) {
    const key = toSimpleIconsKey(attempt);
    const icon = simpleIconsModule[key];
    if (icon) {
      return { svg: icon.svg, hex: icon.hex, title: icon.title };
    }
  }

  return null;
}

/**
 * Get brand color for a service name.
 * Returns the simple-icons hex if found, otherwise a seeded color.
 * Always returns a 6-char hex string WITHOUT the # prefix.
 */
export function getServiceColor(name: string, overrideColor?: string | null): string {
  if (overrideColor) {
    return overrideColor.replace("#", "");
  }
  const icon = getServiceIcon(name);
  return icon ? icon.hex : seededColor(name);
}

/**
 * Determine whether white or black text gives better contrast on a hex background.
 */
export function needsWhiteText(hex: string): boolean {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}
