import { createMemo, Show } from "solid-js"
import { ProviderIcon } from "@opencode/ui/provider-icon"
import type { IconName } from "@opencode/ui/icons/provider"
import { ProviderModelIcon } from "./provider-group"

const families = [
  { pattern: /\b(?:claude|anthropic)\b/, icon: "anthropic" },
  { pattern: /\b(?:gpt|chatgpt|codex|openai|o[1-9])(?:[\d.-]|\b)/, icon: "openai" },
  { pattern: /\b(?:gemini|gemma)(?:[\d.-]|\b)/, icon: "google" },
  { pattern: /\bdeepseek(?:[\d.-]|\b)/, icon: "deepseek" },
  { pattern: /\b(?:kimi|moonshot)(?:[\d.-]|\b)/, icon: "moonshotai" },
  { pattern: /\b(?:qwen|qwq)(?:[\d.-]|\b)/, icon: "alibaba" },
  { pattern: /\b(?:glm|zai|zhipu)(?:[\d.-]|\b)/, icon: "zai" },
  { pattern: /\bminimax(?:[\d.-]|\b)/, icon: "minimax" },
  { pattern: /\bgrok(?:[\d.-]|\b)/, icon: "xai" },
  { pattern: /\b(?:mistral|mixtral|devstral|magistral)(?:[\d.-]|\b)/, icon: "mistral" },
  { pattern: /\bllama(?:[\d.-]|\b)/, icon: "meta" },
  { pattern: /\bnemotron(?:[\d.-]|\b)/, icon: "nvidia" },
  { pattern: /\bcommand(?:[\d.-]|\b)/, icon: "cohere" },
  { pattern: /\bmimo(?:[\d.-]|\b)/, icon: "xiaomi" },
] satisfies { pattern: RegExp; icon: IconName }[]

/** Model identity takes precedence over the gateway serving it. */
export function ModelLogo(props: {
  model: {
    id: string
    name: string
    family?: string
    provider: { id: string; canonical?: string; name: string }
  }
  class?: string
}) {
  const brand = createMemo(() => {
    for (const identity of [props.model.family, props.model.id, props.model.name]) {
      if (!identity) continue
      const icon = families.find((family) => family.pattern.test(identity.toLowerCase()))?.icon

      if (icon) return icon
    }
  })

  return (
    <span
      data-component="model-logo"
      aria-hidden="true"
      class={`inline-flex size-4 shrink-0 items-center justify-center ${props.class ?? ""}`}
    >
      <Show when={brand()} fallback={<ProviderModelIcon provider={props.model.provider} />}>
        {(icon) => <ProviderIcon id={icon()} width={16} height={16} />}
      </Show>
    </span>
  )
}
