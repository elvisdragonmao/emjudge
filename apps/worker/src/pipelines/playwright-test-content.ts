const PLAYWRIGHT_TEST_IMPORT_RE = /^import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]@playwright\/test['"];?\s*$/gm;
const SCREENSHOT_CALL_RE = /\.screenshot\s*\(|toHaveScreenshot\s*\(/;

const AUTO_SCREENSHOT_HOOK = `
test.beforeEach(async ({ page }, testInfo) => {
  let captured = false;

  page.on('load', async () => {
    if (captured) return;
    captured = true;

    await page.screenshot({
      path: testInfo.outputPath('initial-page.png'),
      fullPage: true
    });
  });
});
`.trim();

const PLAYWRIGHT_IMPORT_PRIORITY = new Map([
	["test", 0],
	["expect", 1]
]);

const sortPlaywrightImports = (a: string, b: string) => {
	return (PLAYWRIGHT_IMPORT_PRIORITY.get(a) ?? Number.MAX_SAFE_INTEGER) - (PLAYWRIGHT_IMPORT_PRIORITY.get(b) ?? Number.MAX_SAFE_INTEGER) || a.localeCompare(b);
};

export const normalizePlaywrightTestContent = (content: string) => {
	const imports = new Set<string>();
	const body = content.replace(PLAYWRIGHT_TEST_IMPORT_RE, (_, names: string) => {
		for (const name of names.split(",")) {
			const normalizedName = name.trim();
			if (normalizedName) {
				imports.add(normalizedName);
			}
		}
		return "";
	});

	const needsAutoScreenshot = !SCREENSHOT_CALL_RE.test(content);
	if (needsAutoScreenshot) {
		imports.add("test");
	}

	const importLine = `import { ${Array.from(imports).sort(sortPlaywrightImports).join(", ")} } from '@playwright/test';`;
	const trimmedBody = body.trim();
	const mergedBody = needsAutoScreenshot ? `${AUTO_SCREENSHOT_HOOK}\n\n${trimmedBody}`.trim() : trimmedBody;

	return mergedBody ? `${importLine}\n\n${mergedBody}\n` : `${importLine}\n`;
};
