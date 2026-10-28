export function codespacesHost(env) {
  if (!env.CODESPACE_NAME) return undefined;
  return `${env.CODESPACE_NAME}-3000.${env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || "app.github.dev"}`;
}
