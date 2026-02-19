/**
 * Version checking utility
 * Checks npm registry for latest version and notifies if outdated
 * Inspired by Dialtone MCP Server's version checking
 */

/**
 * Check if a newer version is available on npm
 * Logs a styled warning with update instructions if outdated
 * Fails silently if offline or registry unavailable
 */
export async function checkVersion(
  packageName: string,
  currentVersion: string,
): Promise<void> {
  try {
    const response = await fetch(
      `https://registry.npmjs.org/${packageName}/latest`,
      {
        // Set timeout to avoid hanging
        signal: AbortSignal.timeout(3000),
      },
    );

    if (!response.ok) {
      // Registry unavailable, fail silently
      return;
    }

    const data = (await response.json()) as { version: string };
    const latestVersion = data.version;

    if (currentVersion !== latestVersion) {
      console.error("");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("⚠️  systembridge-mcp Update Available");
      console.error(`   Current: v${currentVersion}`);
      console.error(`   Latest:  v${latestVersion}`);
      console.error("");
      console.error("   To update:");
      console.error("   npm install -D systembridge-mcp@latest");
      console.error("   (then restart your MCP client)");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("");
    } else {
      console.error(`✓ systembridge-mcp v${currentVersion} (up to date)`);
    }
  } catch (error) {
    // Fail silently if:
    // - Network unavailable (offline)
    // - Timeout reached
    // - Registry error
    // This ensures the server still starts even without network access
  }
}
