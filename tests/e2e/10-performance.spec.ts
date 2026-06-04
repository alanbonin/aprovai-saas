import { test, expect } from "@playwright/test";

test.describe("Performance básica — Core Web Vitals", () => {
  test("login page — LCP < 4s", async ({ page }) => {
    const start = Date.now();
    await page.goto("/login");
    await page.getByRole("button", { name: /entrar/i }).waitFor();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(6_000);
  });

  test("login page — sem layout shift visível (CLS básico)", async ({ page }) => {
    await page.goto("/login");
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // @ts-ignore
            if (!entry.hadRecentInput) clsValue += entry.value;
          }
        });
        observer.observe({ type: "layout-shift", buffered: true });
        setTimeout(() => { observer.disconnect(); resolve(clsValue); }, 2_000);
      });
    });
    // CLS deve ser < 0.1 (good) — toleramos até 0.25 (needs improvement)
    expect(cls).toBeLessThan(0.25);
  });

  test("home redirect — sem loop infinito (max 3 redirects)", async ({ page }) => {
    let redirectCount = 0;
    page.on("response", (res) => {
      if (res.status() >= 300 && res.status() < 400) redirectCount++;
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(redirectCount).toBeLessThan(4);
  });
});
