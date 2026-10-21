import { createEffect, onCleanup } from "solid-js"
import { Schema } from "effect"
import { createSimpleContext } from "@opencode/ui/context"
import { Persistence } from "@/runtime/persistence/schema"
import { Persist, persisted } from "@/runtime/persistence/storage"
import { OCEAN_SPECIES, type OceanSpecies } from "@/home/ocean/roster"
import { refreshGlassLenses } from "./glass-lens"
import "./effects.css"

const hex = Schema.String.check(Schema.isPattern(/^#[0-9a-fA-F]{6}$/))

const AppearanceEffectsSchema = Persistence.struct({
  oceanSpecies: Schema.Literals(OCEAN_SPECIES),
  glass: Schema.Boolean,
  glassTransparency: Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 100 })),
  glassBlur: Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 32 })),
  customColors: Schema.Boolean,
  canvas: hex,
  bubble: hex,
  ink: hex,
})

export const { use: useAppearanceEffects, provider: AppearanceEffectsProvider } = createSimpleContext({
  name: "AppearanceEffects",
  gate: false,
  init: () => {
    const [state, setState] = persisted(Persist.global("appearance.effects"), AppearanceEffectsSchema, {
      oceanSpecies: "mixed",
      glass: false,
      glassTransparency: 82,
      glassBlur: 6,
      customColors: false,
      canvas: "#000000",
      bubble: "#ffffff",
      ink: "#111111",
    })

    createEffect(() => {
      const root = document.documentElement
      root.style.setProperty("--ask-glass-tint", `${100 - state.glassTransparency}%`)
      root.style.setProperty("--ask-glass-blur", `${state.glassBlur}px`)
      root.dataset.askGlass = String(state.glass)
      root.dataset.messageColors = String(state.customColors)
      root.style.setProperty("--chat-canvas", state.canvas)
      root.style.setProperty("--chat-bubble", state.bubble)
      root.style.setProperty("--chat-ink", state.ink)
      root.style.setProperty("--chat-canvas-ink", contrast(state.canvas))
      if (state.glass) refreshGlassLenses()
    })
    onCleanup(() => {
      const root = document.documentElement
      delete root.dataset.askGlass
      delete root.dataset.messageColors

      for (const name of [
        "--chat-canvas",
        "--chat-bubble",
        "--chat-ink",
        "--chat-canvas-ink",
        "--ask-glass-tint",
        "--ask-glass-blur",
      ])
        root.style.removeProperty(name)
    })

    return {
      state,
      setOceanSpecies: (value: OceanSpecies) => setState("oceanSpecies", value),
      setGlassTransparency: (value: number) => setState("glassTransparency", value),
      setGlassBlur: (value: number) => setState("glassBlur", value),
      setGlass: (value: boolean) => setState("glass", value),
      setCustomColors: (value: boolean) => setState("customColors", value),
      setColor: (key: "canvas" | "bubble" | "ink", value: string) => setState(key, value),
      panda: () => setState({ customColors: true, canvas: "#000000", bubble: "#ffffff", ink: "#111111" }),
    }
  },
})

function contrast(color: string) {
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(color.slice(offset, offset + 2), 16) / 255

    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 > 0.179 ? "#111111" : "#ffffff"
}
