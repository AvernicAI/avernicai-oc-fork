import { Show, type ParentProps } from "solid-js"
import { OceanBackdrop } from "@/home/ocean/backdrop"

export function SessionRouteFrame(props: ParentProps<{ padded?: boolean }>) {
  return (
    <div
      class="relative flex size-full flex-col"
      classList={{
        "px-[var(--shell-inline-inset,8px)] pb-[var(--shell-bottom-inset,8px)] pt-[var(--shell-top-inset,8px)]":
          props.padded,
      }}
    >
      {props.children}
    </div>
  )
}

export function SessionPanelFrame(props: ParentProps<{ raised?: boolean; background?: boolean }>) {
  return (
    <div
      class="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] bg-v2-background-bg-base"
      classList={{
        "shadow-[var(--v2-elevation-raised)]": props.raised,
        "ocean-surface ocean-chat": props.background,
      }}
    >
      <Show when={props.background}>
        <OceanBackdrop />
      </Show>
      {props.children}
    </div>
  )
}
