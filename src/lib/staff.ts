export type Portal = "station" | "admin";
export const portals = {
  station: { login: "/staff", home: "/security" },
  admin: { login: "/admin", home: "/manager" },
} as const;

export function canOpenPortal(portal: Portal, role: unknown) {
  return role === "admin" || (portal === "station" && role === "officer");
}
