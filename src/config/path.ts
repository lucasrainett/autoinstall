// Default user config file location — needed by the CLI entry point to call config/store.ts's
// readUserConfig with a real path. Pure decision logic over an injected env lookup, same override
// pattern as exec/git-bash.ts's AUTOINSTALL_GIT_BASH_PATH, so it's testable without a real HOME.

export interface ConfigPathEnv {
  getEnv(name: string): string | undefined;
  platform: "linux" | "macos" | "windows";
}

const OVERRIDE_ENV_VAR = "AUTOINSTALL_CONFIG_PATH";

export function resolveConfigPath(env: ConfigPathEnv): string {
  const override = env.getEnv(OVERRIDE_ENV_VAR);
  if (override !== undefined && override.length > 0) return override;

  if (env.platform === "windows") {
    const appData = env.getEnv("APPDATA") ?? "C:\\Users\\Default\\AppData\\Roaming";
    return `${appData}\\autoinstall\\config.toml`;
  }

  const xdgConfig = env.getEnv("XDG_CONFIG_HOME");
  const home = env.getEnv("HOME") ?? "/root";
  const base = xdgConfig !== undefined && xdgConfig.length > 0 ? xdgConfig : `${home}/.config`;
  return `${base}/autoinstall/config.toml`;
}

/** Real wrapper: checks the actual environment. */
export function resolveConfigPathOnDisk(platform: "linux" | "macos" | "windows"): string {
  return resolveConfigPath({ getEnv: (name) => Deno.env.get(name), platform });
}
