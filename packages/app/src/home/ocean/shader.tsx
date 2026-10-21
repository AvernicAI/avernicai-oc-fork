import { onCleanup, onMount } from "solid-js"
import { createStore } from "solid-js/store"
import { useLanguage } from "@/runtime/i18n/language"
import type { createShader } from "./shader-engine"

export function ShaderBackdrop(props: { kind: "silk" | "waves" }) {
  const language = useLanguage()
  const [state, setState] = createStore({ paused: false })
  let canvas!: HTMLCanvasElement
  let engine: ReturnType<typeof createShader>
  let disposed = false
  onMount(async () => {
    const { createShader } = await import("./shader-engine")
    if (disposed) return
    engine = createShader(canvas, props.kind)
    engine?.setPaused(state.paused)
  })
  onCleanup(() => {
    disposed = true
    engine?.destroy()
  })
  return (
    <>
      <div class={`ocean-backdrop ocean-custom shader-backdrop ${props.kind}-backdrop`} aria-hidden="true">
        <canvas ref={canvas} />
        <div class="ocean-haze" />
      </div>
      <button
        type="button"
        class="ocean-motion"
        aria-label={language.t(state.paused ? `home.${props.kind}.play` : `home.${props.kind}.pause`)}
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
