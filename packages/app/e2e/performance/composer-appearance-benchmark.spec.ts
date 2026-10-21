import { benchmark, benchmarkDiagnostics, expect } from "./benchmark"
import { openSession } from "../utils/workspace"
import { fixture } from "../utils/session-fixture"

benchmark.use({ viewport: { width: 1440, height: 900 }, traceScope: "interaction", video: "off", trace: "off" })

for (const mode of ["default", "glass", "panda", "combined"] as const) {
  benchmark(`composer appearance: ${mode}`, async ({ page, report }) => {
    const session = fixture.sessions.find((item) => item.id === fixture.sourceID)!

    const { editor } = await openSession(page, {
      name: "Appearance benchmark",
      directory: fixture.directory,
      project: fixture.project,
      provider: fixture.provider,
      sessions: [session],
      pageMessages: () => ({ items: fixture.messages[fixture.sourceID] }),
      seed: {
        storage: {
          "opencode.global.dat:appearance.effects": {
            glass: mode === "glass" || mode === "combined",
            customColors: mode === "panda" || mode === "combined",
            canvas: "#000000",
            bubble: "#ffffff",
            ink: "#111111",
          },
        },
      },
    })

    await expect(page.locator('[data-slot="text-part-body"]').nth(0)).toBeVisible()
    const cdp = await page.context().newCDPSession(page)
    await cdp.send("Performance.enable")
    await benchmarkDiagnostics(page).startTrace()
    const before = await cdp.send("Performance.getMetrics")
    const text = "Review these changes and keep the existing error handling. ".repeat(3)
    await editor.pressSequentially(text)
    await expect(editor).toHaveText(text)
    const scroller = page.locator(".scroll-view__viewport", { has: page.locator("[data-timeline-row]") })
    await scroller.hover()
    await page.mouse.wheel(0, -100000)
    await expect(scroller).toHaveJSProperty("scrollTop", 0)
    const after = await cdp.send("Performance.getMetrics")
    await benchmarkDiagnostics(page).stop()

    const names = [
      "TaskDuration",
      "ScriptDuration",
      "LayoutDuration",
      "RecalcStyleDuration",
      "LayoutCount",
      "RecalcStyleCount",
    ]

    const metrics = Object.fromEntries(
      names.map((name) => [
        name,
        (after.metrics.find((item) => item.name === name)?.value ?? 0) -
          (before.metrics.find((item) => item.name === name)?.value ?? 0),
      ]),
    )

    report(metrics, { mode, characters: text.length, data: "production composer and transcript" })
    await cdp.detach()
  })
}
