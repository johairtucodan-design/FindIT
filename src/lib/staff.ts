export function staffDestination(role: unknown) {
  if (role === "admin") return "/manager";
  if (role === "officer") return "/security";
  return null;
}
