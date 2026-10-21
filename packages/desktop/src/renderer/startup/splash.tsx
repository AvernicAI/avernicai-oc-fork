import { Splash } from "@opencode/ui/logo"
import { Wordmark } from "@opencode/ui/wordmark"
import type { Platform } from "@opencode/app/desktop"
import { onCleanup, onMount, Show } from "solid-js"
import { createStore } from "solid-js/store"
import wallpaper from "./assets/wallhaven-5ypy88.jpg"
import "./splash.css"

export function LoadingSplash(props: {
  deep: boolean
  firstLaunch: boolean
  platform: Platform
  preview: boolean
  onDrawEnd: () => void
  onMinimumDisplay: () => void
}) {
  const [drawing, setDrawing] = createStore({ started: false })
  let displayTimer: ReturnType<typeof setTimeout> | undefined
  const imageReady = () => {
    if (displayTimer !== undefined) return
    // Start after the wallpaper loads so fast launches still show the artwork for two seconds.
    displayTimer = setTimeout(props.onMinimumDisplay, 2000)
  }
  onCleanup(() => clearTimeout(displayTimer))
  onMount(() => {
    if (!props.preview || !props.firstLaunch) return
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")

    const start = () => {
      if (document.visibilityState !== "visible" || !document.hasFocus()) return
      setDrawing("started", true)

      if (motion.matches) props.onDrawEnd()
    }

    window.addEventListener("focus", start)
    document.addEventListener("visibilitychange", start)
    motion.addEventListener("change", start)
    start()
    onCleanup(() => {
      window.removeEventListener("focus", start)
      document.removeEventListener("visibilitychange", start)
      motion.removeEventListener("change", start)
    })
  })

  return (
    <div
      data-component={props.firstLaunch ? "first-launch-splash" : "startup-splash"}
      data-drawing={props.preview && !drawing.started ? "pending" : "running"}
      class="startup-wallpaper-splash"
      aria-hidden="true"
      onAnimationEnd={(event) => {
        if (props.firstLaunch && event.animationName === "first-launch-wordmark-draw") props.onDrawEnd()
      }}
    >
      <img class="startup-wallpaper" src={wallpaper} alt="" decoding="async" onLoad={imageReady} onError={imageReady} />
      <div class="startup-brand">
        <Splash class="startup-brand-mark" />
        <Show
          when={props.firstLaunch}
          fallback={<Wordmark fade={false} muted={false} class="startup-brand-wordmark" />}
        >
          <Wordmark outline fade={false} muted={false} class="startup-brand-wordmark" />
        </Show>
      </div>
    </div>
  )
}
