import { onCleanup, onMount } from "solid-js"
import { createStore } from "solid-js/store"
import { useLanguage } from "@/runtime/i18n/language"
import type { createSilk } from "./silk-engine"

export function SilkBackdrop() {
  const language = useLanguage()
  const [state, setState] = createStore({ paused: false })
  let canvas!: HTMLCanvasElement
  let engine: ReturnType<typeof createSilk>
  let disposed = false
  onMount(async () => {
    const { createSilk } = await import("./silk-engine")
    if (disposed) return
    engine = createSilk(canvas)
    engine?.setPaused(state.paused)
  })
  onCleanup(() => {
    disposed = true
    engine?.destroy()
  })
  return (
    <>
      <div class="ocean-backdrop ocean-custom silk-backdrop" aria-hidden="true">
        <canvas ref={canvas} />
        <div class="ocean-haze" />
      </div>
      <button
        type="button"
        class="ocean-motion"
        aria-label={language.t(state.paused ? "home.silk.play" : "home.silk.pause")}
        aria-pressed={state.paused}
        onClick={() => {
          setState("paused", !state.paused)
          engine?.setPaused(state.paused)
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">
          <path d="M3 8c4-7 7 7 11 0s6 2 7 0M3 16c4-7 7 7 11 0s6 2 7 0" />
          {state.paused && <path d="m4 3 16 18" />}
        </svg>
      </button>
    </>
  )
}
