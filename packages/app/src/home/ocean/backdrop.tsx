import { Show, createEffect, on, onCleanup, onMount } from "solid-js"
import { createStore } from "solid-js/store"
import { useLanguage } from "@/runtime/i18n/language"
import { useBackground } from "@/settings/appearance/background"
import { useAppearanceEffects } from "@/settings/appearance/effects"
import { oceanRoster } from "./roster"
import type { OceanEngine } from "./engine"
import { ShaderBackdrop } from "./shader"
import "./ocean.css"

export function OceanBackdrop() {
  const background = useBackground()
  const shader = () => {
    const mode = background.mode()
    return mode === "silk" || mode === "waves" ? mode : undefined
  }

  return (
    <Show
      when={background.media()}
      fallback={
        <Show when={shader()} fallback={<SharkBackdrop />} keyed>
          {(kind) => <ShaderBackdrop kind={kind} />}
        </Show>
      }
    >
      <MediaBackdrop />
    </Show>
  )
}

function SharkBackdrop() {
  const effects = useAppearanceEffects()
  let canvas!: HTMLCanvasElement
  let engine: OceanEngine | undefined
  let disposed = false
  let Engine: typeof OceanEngine | undefined

  const start = () => {
    if (!Engine) return
    engine?.destroy()
    engine = new Engine(canvas, oceanRoster(effects.state.oceanSpecies))
  }

  createEffect(on(() => effects.state.oceanSpecies, start))

  onMount(async () => {
    const { OceanEngine } = await import("./engine")

    if (disposed) return
    Engine = OceanEngine
    start()
  })
  onCleanup(() => {
    disposed = true
    engine?.destroy()
  })

  return (
    <div class="ocean-backdrop" aria-hidden="true">
      <canvas ref={canvas} />
      <div class="ocean-haze" />
    </div>
  )
}

function MediaBackdrop() {
  const background = useBackground()
  const language = useLanguage()

  // SAFETY: the video ref is assigned only by the video element rendered below.
  const [state, setState] = createStore({
    paused: false,
    visible: true,
    hidden: document.hidden,
    video: undefined as HTMLVideoElement | undefined,
  })

  let container!: HTMLDivElement
  onMount(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    setState("paused", motion.matches)

    const preference = () => {
      if (motion.matches) setState("paused", true)
    }

    const visibility = () => setState("hidden", document.hidden)
    const observer = new IntersectionObserver(([entry]) => setState("visible", entry.isIntersecting))
    observer.observe(container)
    motion.addEventListener("change", preference)
    document.addEventListener("visibilitychange", visibility)
    onCleanup(() => {
      observer.disconnect()
      motion.removeEventListener("change", preference)
      document.removeEventListener("visibilitychange", visibility)
      state.video?.pause()
    })
  })
  createEffect(() => {
    const video = state.video
    const url = background.url()

    if (!video || !url) return

    if (state.paused || !state.visible || state.hidden) {
      video.pause()

      return
    }

    void video.play().catch((error: DOMException) => {
      if (error instanceof DOMException && error.name === "AbortError") return
      setState("paused", true)
    })
  })

  return (
    <>
      <div ref={container} class="ocean-backdrop ocean-custom" aria-hidden="true">
        <Show when={background.url()} keyed>
          {(url) => (
            <Show
              when={background.media()?.kind === "video"}
              fallback={<img src={url} alt="" onError={background.failed} />}
            >
              <video
                ref={(video) => setState("video", video)}
                src={url}
                muted
                loop
                playsinline
                preload="auto"
                onError={background.failed}
              />
            </Show>
          )}
        </Show>
        <div class="ocean-haze" />
      </div>
      <Show when={background.media()?.kind === "video"}>
        <button
          type="button"
          class="ocean-motion"
          aria-label={language.t(state.paused ? "home.background.play" : "home.background.pause")}
          aria-pressed={state.paused}
          onClick={() => setState("paused", !state.paused)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <Show when={state.paused} fallback={<path d="M9 5v14M15 5v14" />}>
              <path d="m9 5 10 7-10 7Z" />
            </Show>
          </svg>
        </button>
      </Show>
    </>
  )
}
