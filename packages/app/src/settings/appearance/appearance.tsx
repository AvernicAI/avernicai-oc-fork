import { Component, Show } from "solid-js"
import { Button } from "@opencode/ui/button"
import { AppearanceEffectsControls } from "./effects-controls"
import { useBackground } from "./background"
import { Select } from "@opencode/ui/select"
import { TextInput } from "@opencode/ui/text-input"
import { useLanguage } from "@/runtime/i18n/language"
import { ExternalLink } from "@/runtime/platform/external-link"
import { SettingsList } from "@/settings/list"
import { SettingsRow } from "@/settings/row"
import { createAppearanceSettingsController, type AppearanceSettingsController } from "@/settings/general/controllers"
import "@/settings/settings.css"

const schemeOptions: ("system" | "light" | "dark")[] = ["system", "light", "dark"]

const fontSettings = {
  ui: {
    action: "settings-ui-font",
    title: "settings.general.row.uiFont.title",
    description: "settings.general.row.uiFont.description",
    font: "ui",
    input: "setUI",
  },
  code: {
    action: "settings-code-font",
    title: "settings.general.row.font.title",
    description: "settings.general.row.font.description",
    font: "code",
    input: "setCode",
  },
  terminal: {
    action: "settings-terminal-font",
    title: "settings.general.row.terminalFont.title",
    description: "settings.general.row.terminalFont.description",
    font: "terminal",
    input: "setTerminal",
  },
} as const

const FontSetting: Component<{
  kind: "ui" | "code" | "terminal"
  fonts: AppearanceSettingsController["fonts"]
}> = (props) => {
  const language = useLanguage()
  const config = () => fontSettings[props.kind]

  return (
    <SettingsRow title={language.t(config().title)} description={language.t(config().description)}>
      <div class="w-full sm:w-[220px]">
        <TextInput
          data-action={config().action}
          type="text"
          appearance="base"
          value={props.fonts[config().font]().value}
          onInput={(event) => props.fonts[config().input](event.currentTarget.value)}
          placeholder={props.fonts[config().font]().placeholder}
          spellcheck={false}
          autocorrect="off"
          autocomplete="off"
          autocapitalize="off"
          aria-label={language.t(config().title)}
          style={{ "font-family": props.fonts[config().font]().family }}
        />
      </div>
    </SettingsRow>
  )
}

export const SettingsAppearance: Component = () => {
  const language = useLanguage()
  const appearance = createAppearanceSettingsController()
  const background = useBackground()
  let picker!: HTMLInputElement

  return (
    <>
      <div class="settings-tab-header">
        <div class="settings-tab-header-row">
          <div class="flex flex-col gap-1">
            <h2 class="settings-tab-title">{language.t("settings.general.section.appearance")}</h2>
            <span class="text-11-regular text-v2-text-text-muted">{language.t("settings.appearance.description")}</span>
          </div>
        </div>
      </div>

      <div class="settings-tab-body">
        <div class="settings-section">
          <SettingsList>
            <SettingsRow
              title={language.t("settings.general.row.colorScheme.title")}
              description={language.t("settings.general.row.colorScheme.description")}
            >
              <Select
                data-action="settings-color-scheme"
                options={schemeOptions}
                current={schemeOptions.find((option) => option === appearance.scheme.current())}
                placement="bottom-end"
                gutter={6}
                label={(option) => {
                  if (option === "system") return language.t("theme.scheme.system")

                  if (option === "light") return language.t("theme.scheme.light")

                  return language.t("theme.scheme.dark")
                }}
                onSelect={(option) => option && appearance.scheme.select(option)}
              />
            </SettingsRow>

            <SettingsRow
              title={language.t("settings.general.row.theme.title")}
              description={
                <>
                  {language.t("settings.general.row.theme.description")}{" "}
                  <ExternalLink class="settings-link" href="https://opencode.ai/docs/themes/">
                    {language.t("common.learnMore")}
                  </ExternalLink>
                </>
              }
            >
              <Select
                data-action="settings-theme"
                options={appearance.theme.options()}
                current={appearance.theme.current()}
                placement="bottom-end"
                gutter={6}
                value={(option) => option.id}
                label={(option) => option.name}
                onSelect={appearance.theme.select}
              />
            </SettingsRow>

            <SettingsRow
              title={language.t("settings.background.title")}
              description={language.t("settings.background.description")}
            >
              <div class="flex flex-wrap gap-2">
                <input
                  ref={picker}
                  type="file"
                  accept="image/png,video/*"
                  class="hidden"
                  aria-label={language.t("settings.background.choose")}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0]
                    event.currentTarget.value = ""

                    if (file) void background.choose(file)
                  }}
                />
                <Button
                  variant="outline"
                  data-action="settings-background"
                  disabled={!background.ready() || background.busy()}
                  onClick={() => picker.click()}
                >
                  {language.t(background.busy() ? "settings.background.saving" : "settings.background.choose")}
                </Button>
                <Button
                  variant="ghost"
                  disabled={background.mode() === "ocean" || background.busy()}
                  onClick={background.reset}
                >
                  {language.t("settings.background.reset")}
                </Button>
              </div>
            </SettingsRow>
            <SettingsRow
              title={language.t("settings.background.style")}
              description={language.t("settings.background.style.description")}
            >
              <Select<"ocean" | "silk" | "custom">
                data-action="settings-background-style"
                options={background.media() ? ["ocean", "silk", "custom"] : ["ocean", "silk"]}
                current={background.mode()}
                label={(mode) => language.t(`settings.background.${mode}`)}
                disabled={!background.ready() || background.busy()}
                onSelect={(mode) => mode && mode !== "custom" && void background.select(mode)}
                placement="bottom-end"
                gutter={6}
              />
            </SettingsRow>
            <Show when={background.media()}>
              {(media) => (
                <div class="flex flex-col gap-2 p-4">
                  <span class="text-12-regular text-v2-text-text-muted">{media().name}</span>
                  <Show when={background.url()} keyed>
                    {(url) => (
                      <Show
                        when={media().kind === "video"}
                        fallback={
                          <img
                            src={url}
                            alt={media().name}
                            class="aspect-video w-full max-w-[480px] rounded-lg object-cover"
                            onError={background.failed}
                          />
                        }
                      >
                        <video
                          src={url}
                          aria-label={language.t("settings.background.preview")}
                          controls
                          muted
                          loop
                          playsinline
                          preload="metadata"
                          class="aspect-video w-full max-w-[480px] rounded-lg object-cover"
                          onError={background.failed}
                        />
                      </Show>
                    )}
                  </Show>
                </div>
              )}
            </Show>
            <Show when={background.error()}>
              <p role="alert" class="p-4 text-12-regular text-v2-text-text-muted">
                {language.t("settings.background.error")}
              </p>
            </Show>

            <AppearanceEffectsControls />
            <FontSetting kind="ui" fonts={appearance.fonts} />
            <FontSetting kind="code" fonts={appearance.fonts} />
            <FontSetting kind="terminal" fonts={appearance.fonts} />
          </SettingsList>
        </div>
      </div>
    </>
  )
}
