/** @file Runtime startup configuration, independent of account transport. */
export interface SystemConfig {
  loginEnabled: boolean;
}
/** @brief Only an explicit JSON false disables login; missing or invalid config keeps authentication enabled. */
export function parseSystemConfig(value: unknown): SystemConfig {
  return {
    loginEnabled: !(
      value &&
      typeof value === "object" &&
      "loginEnabled" in value &&
      value.loginEnabled === false
    ),
  };
}
/** @brief Read deployment-editable config on each app opening, without browser caching. */
export async function loadSystemConfig(
  fetcher: typeof fetch = fetch,
): Promise<SystemConfig> {
  try {
    const response = await fetcher("/system-config.json", {
      cache: "no-store",
    });
    return response.ok
      ? parseSystemConfig(await response.json())
      : { loginEnabled: true };
  } catch {
    return { loginEnabled: true };
  }
}
