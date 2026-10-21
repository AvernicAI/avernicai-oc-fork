import { createMemo, createResource, onMount, type Accessor } from "solid-js"
import { createStore } from "solid-js/store"
import { Schema } from "effect"
import type { ColorScheme } from "@opencode/ui/theme/context"
import { useTheme } from "@opencode/ui/theme/context"
import {
  monoDefault,
  monoFontFamily,
  monoInput,
  sansDefault,
  sansFontFamily,
  sansInput,
  terminalDefault,
  terminalFontFamily,
  terminalInput,
  useSettings,
} from "@/settings/model"
import { CUSTOM_SOUND_PREFIX, playSoundById, SOUND_OPTIONS } from "@/shell/notifications/sound"
import { Persist, persisted } from "@/runtime/persistence/storage"
import { Persistence } from "@/runtime/persistence/schema"
import { usePlatform } from "@/runtime/platform/platform"
import { createSoundPreviewController } from "./behavior"
import { ServerConnection } from "@/runtime/server/registry"
import { useServerCtx } from "@/runtime/server/runtime"
import { useLanguage } from "@/runtime/i18n/language"
import { showToast } from "@/shell/notifications/toast"

export { createShellOptions, createSoundPreviewController } from "./behavior"

export type { ShellOption, ShellSelectOption } from "./behavior"

export function createServerShellController(server: Accessor<ServerConnection.Any>) {
  const language = useLanguage()
  const serverCtx = useServerCtx(server)
  const source = () => ServerConnection.key(server())

  const [state, actions] = createResource(
    source,
    async () => {
      const context = serverCtx()

      const [entries, shells] = await Promise.all([
        context.sdk.api.config.get().catch(() => []),
        context.sdk.api.config.shells().catch(() => []),
      ])

      const boundary = entries.findIndex((entry) => entry.type === "directory")
      const global = boundary === -1 ? entries : entries.slice(0, boundary)

      return {
        shells,
        shell: global
          .flatMap((entry) => (entry.type === "document" && entry.info.shell !== undefined ? [entry.info.shell] : []))
          .at(-1),
      }
    },
    { initialValue: { shells: [], shell: undefined } },
  )

  return {
    shells: () => state.latest.shells,
    current: () => state.latest.shell ?? "",
    select: (value: string) => {
      if (value === (state.latest.shell ?? "")) return
      const previous = state.latest
      actions.mutate({ ...previous, shell: value || undefined })
      void serverCtx()
        .sdk.api.config.update({ shell: value || null })
        .catch((error: unknown) => {
          actions.mutate(previous)
          showToast({
            variant: "error",
            title: language.t("common.requestFailed"),
            description: error instanceof Error ? error.message : language.t("common.requestFailed"),
          })
        })
    },
  }
}

export function createAppearanceSettingsController() {
  const settings = useSettings()
  const theme = useTheme()
  const themes = createMemo(() => theme.ids().map((id) => ({ id, name: theme.name(id) })))

  onMount(() => void theme.loadThemes())

  return {
    scheme: {
      current: theme.colorScheme,
      select: (value: ColorScheme) => theme.setColorScheme(value),
    },
    theme: {
      options: themes,
      current: createMemo(() => themes().find((option) => option.id === theme.themeId())),
      select: (option: { id: string } | null) => option && theme.setTheme(option.id),
    },
    fonts: {
      ui: createMemo(() => ({
        value: sansInput(settings.appearance.uiFont()),
        family: sansFontFamily(settings.appearance.uiFont()),
        placeholder: sansDefault,
      })),
      code: createMemo(() => ({
        value: monoInput(settings.appearance.font()),
        family: monoFontFamily(settings.appearance.font()),
        placeholder: monoDefault,
      })),
      terminal: createMemo(() => ({
        value: terminalInput(settings.appearance.terminalFont()),
        family: terminalFontFamily(settings.appearance.terminalFont()),
        placeholder: terminalDefault,
      })),
      setUI: (value: string) => settings.appearance.setUIFont(value),
      setCode: (value: string) => settings.appearance.setFont(value),
      setTerminal: (value: string) => settings.appearance.setTerminalFont(value),
    },
  }
}

const noneSound = { id: "none", label: "sound.option.none" } as const

export const soundOptions = [noneSound, ...SOUND_OPTIONS]

/** A built-in sound labelled by translation key, or a chosen file labelled by its name. */
export type SoundSelectOption = { id: string; label: string; custom?: boolean }

const CustomSoundSchema = Schema.NullOr(
  Persistence.struct({
    name: Schema.String,
    blob: Persistence.struct({ id: Schema.String, url: Persistence.optional(Schema.String) }),
  }),
)

// The chosen files live in the draft store so their bytes survive restarts. This document is what keeps
// each blob referenced; the sound settings only hold the `file:` id that playback resolves.
const CustomSoundsSchema = Persistence.struct({
  agent: CustomSoundSchema,
  permissions: CustomSoundSchema,
  errors: CustomSoundSchema,
})

type SoundChannel = "agent" | "permissions" | "errors"

export function createSoundSettingsController() {
  const settings = useSettings()
  const platform = usePlatform()
  const preview = createSoundPreviewController(playSoundById)
  const target = Persist.prompt(Persist.global("sounds.custom"))
  const key = `${target.storage}:${target.key}`
  const [custom, setCustom] = persisted(target, CustomSoundsSchema, { agent: null, permissions: null, errors: null })
  const [status, setStatus] = createStore({
    busy: undefined as SoundChannel | undefined,
    error: undefined as SoundChannel | undefined,
  })

  const channel = (
    name: SoundChannel,
    enabled: Accessor<boolean>,
    current: Accessor<string>,
    setEnabled: (value: boolean) => void,
    set: (id: string) => void,
  ) => {
    const options = createMemo((): SoundSelectOption[] => {
      const file = custom[name]

      if (!file) return soundOptions

      return [noneSound, { id: CUSTOM_SOUND_PREFIX + file.blob.id, label: file.name, custom: true }, ...SOUND_OPTIONS]
    })

    const select = (option: SoundSelectOption | null) => {
      if (!option) return

      if (option.id === "none") {
        setEnabled(false)
        preview.stop()

        return
      }

      setEnabled(true)
      set(option.id)
      preview.play(option.id)
    }

    return {
      options,
      current: createMemo((): SoundSelectOption =>
        enabled() ? (options().find((option) => option.id === current()) ?? noneSound) : noneSound,
      ),
      busy: () => status.busy === name,
      error: () => status.error === name,
      highlight: (option: SoundSelectOption | undefined) => {
        if (!option) return
        preview.play(option.id === "none" ? undefined : option.id)
      },
      select,
      async choose(file: File) {
        if (status.busy) return
        setStatus({ busy: name, error: undefined })
        await Promise.resolve()
          .then(async () => {
            if (!platform.draftStore) throw new Error("Custom sounds need on-device storage")
            await validateAudio(file)
            const blob = await platform.draftStore.putBlob(file)
            const next = { ...custom, [name]: { name: file.name, blob } }
            await platform.draftStore.setDocument(key, next)
            setCustom(name, { name: file.name, blob })
            select({ id: CUSTOM_SOUND_PREFIX + blob.id, label: file.name, custom: true })
          })
          .catch(() => setStatus("error", name))
          .finally(() => setStatus("busy", undefined))
      },
    }
  }

  return {
    agent: channel(
      "agent",
      settings.sounds.agentEnabled,
      settings.sounds.agent,
      (value) => settings.sounds.setAgentEnabled(value),
      (id) => settings.sounds.setAgent(id),
    ),
    permissions: channel(
      "permissions",
      settings.sounds.permissionsEnabled,
      settings.sounds.permissions,
      (value) => settings.sounds.setPermissionsEnabled(value),
      (id) => settings.sounds.setPermissions(id),
    ),
    errors: channel(
      "errors",
      settings.sounds.errorsEnabled,
      settings.sounds.errors,
      (value) => settings.sounds.setErrorsEnabled(value),
      (id) => settings.sounds.setErrors(id),
    ),
  }
}

// Rejects files the webview cannot decode, so a broken pick fails here rather than silently at alert time.
function validateAudio(file: File) {
  const url = URL.createObjectURL(file)
  const audio = new Audio()
  audio.preload = "metadata"

  return new Promise<void>((resolve, reject) => {
    audio.onloadedmetadata = () => resolve()
    audio.onerror = () => reject(new Error("Unsupported audio"))
    audio.src = url
  }).finally(() => {
    audio.removeAttribute("src")
    audio.load()
    URL.revokeObjectURL(url)
  })
}

export type ShellSettingsController = ReturnType<typeof createServerShellController>

export type AppearanceSettingsController = ReturnType<typeof createAppearanceSettingsController>

export type SoundSettingsController = ReturnType<typeof createSoundSettingsController>
