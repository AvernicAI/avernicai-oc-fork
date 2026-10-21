import { onCleanup, onMount } from "solid-js"
import type { createShader } from "./shader-engine"

export function ShaderBackdrop(props: { kind: "silk" | "waves" }) {
  let canvas!: HTMLCanvasElement
  let engine: ReturnType<typeof createShader>
  let disposed = false
  onMount(async () => {
    const { createShader } = await import("./shader-engine")
    if (disposed) return
    engine = createShader(canvas, props.kind)
  })
  onCleanup(() => {
    disposed = true
    engine?.destroy()
  })
  return (
    <div class={`ocean-backdrop ocean-custom shader-backdrop ${props.kind}-backdrop`} aria-hidden="true">
      <canvas ref={canvas} />
      <div class="ocean-haze" />
    </div>
  )
}
