import { Show, Suspense, createMemo, lazy } from "solid-js"
import { createStore } from "solid-js/store"
import { createMediaQuery } from "@solid-primitives/media"
import { Popover } from "@kobalte/core/popover"
import { Button } from "@opencode/ui/button"
import { Icon } from "@opencode/ui/icon"
import { useLanguage } from "@/runtime/i18n/language"
import type { ComposerSelectControl } from "./interaction"
import "./reasoning.css"

const MobilePanelDrawer = lazy(async () => {
  const { MobilePanelDrawer } = await import("@/shell/mobile-panel-drawer")

  return { default: MobilePanelDrawer }
})

const ranks = new Map([
  ["default", -1],
  ["none", 0],
  ["minimal", 1],
  ["low", 2],
  ["medium", 3],
  ["balanced", 3],
  ["high", 4],
  ["xhigh", 5],
  ["max", 6],
])

// The dial sweeps 270°, leaving a gap at the bottom like a hardware knob.
const sweep = 270
const ring = 2 * Math.PI * 20
const mini = 2 * Math.PI * 5

export function ReasoningPicker(props: { title: string; control: ComposerSelectControl }) {
  const language = useLanguage()
  const mobile = createMediaQuery("(max-width: 767px)")
  const [state, setState] = createStore({ open: false, loaded: false })

  const options = createMemo(() =>
    props.control
      .options()
      .toSorted((a, b) => (ranks.get(a.id.toLowerCase()) ?? 3) - (ranks.get(b.id.toLowerCase()) ?? 3)),
  )

  const index = () =>
    Math.max(
      0,
      options().findIndex((option) => option.id === props.control.current()),
    )

  const last = () => Math.max(1, options().length - 1)
  const progress = () => index() / last()
  const label = () => options()[index()]?.label ?? props.control.current()
  let trigger: HTMLButtonElement | undefined
  let slider: HTMLDivElement | undefined
  let wheel = 0

  const open = (value: boolean) => {
    setState("open", value)

    if (value) setState("loaded", true)
  }

  const select = (position: number) => {
    const option = options()[Math.min(options().length - 1, Math.max(0, position))]

    if (!option || option.id === props.control.current()) return
    props.control.onSelect(option.id)
  }

  const keys = () => ({
    ArrowUp: index() + 1,
    ArrowDown: index() - 1,
    [language.direction() === "rtl" ? "ArrowLeft" : "ArrowRight"]: index() + 1,
    [language.direction() === "rtl" ? "ArrowRight" : "ArrowLeft"]: index() - 1,
    Home: 0,
    End: options().length - 1,
  })

  // Converts the pointer to a clockwise angle from 12 o'clock; the dead zone at the bottom snaps to the nearer end.
  const pick = (event: PointerEvent & { currentTarget: HTMLDivElement }) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const degrees =
      (Math.atan2(event.clientX - rect.left - rect.width / 2, rect.top + rect.height / 2 - event.clientY) * 180) /
      Math.PI
    select(Math.round(((Math.max(-sweep / 2, Math.min(sweep / 2, degrees)) + sweep / 2) / sweep) * last()))
  }

  const content = () => (
    <div class="reasoning-card" dir={language.direction()}>
      <div
        ref={slider}
        class="reasoning-dial"
        role="slider"
        tabindex="0"
        aria-label={language.t("composer.reasoning.title")}
        aria-valuemin={0}
        aria-valuemax={options().length - 1}
        aria-valuenow={index()}
        aria-valuetext={label()}
        onKeyDown={(event) => {
          const target = keys()[event.key]

          if (target === undefined) return
          event.preventDefault()
          select(target)
        }}
        onPointerDown={(event) => {
          event.preventDefault()
          event.currentTarget.setPointerCapture(event.pointerId)
          event.currentTarget.focus()
          pick(event)
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) pick(event)
        }}
        onWheel={(event) => {
          event.preventDefault()
          // Trackpads emit many small deltas; accumulate them so one notch moves one level.
          wheel += event.deltaY

          if (Math.abs(wheel) < 40) return
          select(index() + (wheel < 0 ? 1 : -1))
          wheel = 0
        }}
      >
        <svg viewBox="0 0 52 52" aria-hidden="true">
          <circle
            class="reasoning-dial-track"
            cx="26"
            cy="26"
            r="20"
            stroke-dasharray={`${(ring * sweep) / 360} ${ring}`}
          />
          <circle
            class="reasoning-dial-fill"
            cx="26"
            cy="26"
            r="20"
            stroke-dasharray={`${((ring * sweep) / 360) * progress()} ${ring}`}
          />
          <circle
            class="reasoning-dial-handle"
            cx="26"
            cy="6"
            r="3.5"
            style={{ transform: `rotate(${-sweep / 2 + sweep * progress()}deg)` }}
          />
        </svg>
      </div>
      <div class="reasoning-card-title">
        <span class="reasoning-card-model">{language.t("composer.reasoning.label")}</span>
        <span class="reasoning-card-level">{label()}</span>
      </div>
    </div>
  )

  const button = () => (
    <>
      <svg class="reasoning-mini" viewBox="0 0 14 14" aria-hidden="true">
        <circle class="reasoning-dial-track" cx="7" cy="7" r="5" stroke-dasharray={`${(mini * sweep) / 360} ${mini}`} />
        <circle
          class="reasoning-dial-fill"
          cx="7"
          cy="7"
          r="5"
          stroke-dasharray={`${((mini * sweep) / 360) * progress()} ${mini}`}
        />
      </svg>
      <span class="capitalize">{label()}</span>
      <Icon name="chevron-down" />
    </>
  )

  return (
    <Show
      when={mobile()}
      fallback={
        <Popover open={state.open} onOpenChange={open} placement="top-start" gutter={6}>
          <Popover.Trigger as={Button} variant="ghost-muted" class="reasoning-control" aria-label={props.title}>
            {button()}
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              class="reasoning-popover"
              aria-label={props.title}
              onOpenAutoFocus={(event) => {
                event.preventDefault()
                slider?.focus()
              }}
            >
              {content()}
            </Popover.Content>
          </Popover.Portal>
        </Popover>
      }
    >
      <Button
        ref={trigger}
        variant="ghost-muted"
        class="reasoning-control"
        aria-label={props.title}
        aria-haspopup="dialog"
        aria-expanded={state.open}
        onClick={() => open(true)}
      >
        {button()}
      </Button>
      <Show when={state.loaded}>
        <Suspense>
          <MobilePanelDrawer
            hideHeader
            title={props.title}
            open={state.open}
            onOpenChange={open}
            returnFocus={() => trigger}
          >
            {content()}
          </MobilePanelDrawer>
        </Suspense>
      </Show>
    </Show>
  )
}
