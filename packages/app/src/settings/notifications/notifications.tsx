import { Component, Show } from "solid-js"
import { Button } from "@opencode/ui/button"
import { Select } from "@opencode/ui/select"
import { Switch } from "@opencode/ui/switch"
import { useLanguage } from "@/runtime/i18n/language"
import { useSettings } from "@/settings/model"
import { SettingsList } from "@/settings/list"
import { SettingsRow } from "@/settings/row"
import { createSoundSettingsController, type SoundSettingsController } from "@/settings/general/controllers"
import "@/settings/settings.css"

const soundSettings = {
  agent: {
    action: "settings-sounds-agent",
    title: "settings.general.sounds.agent.title",
    description: "settings.general.sounds.agent.description",
  },
  permissions: {
    action: "settings-sounds-permissions",
    title: "settings.general.sounds.permissions.title",
    description: "settings.general.sounds.permissions.description",
  },
  errors: {
    action: "settings-sounds-errors",
    title: "settings.general.sounds.errors.title",
    description: "settings.general.sounds.errors.description",
  },
} as const

const SoundSetting: Component<{
  kind: "agent" | "permissions" | "errors"
  channel: SoundSettingsController["agent"]
}> = (props) => {
  const language = useLanguage()
  const config = () => soundSettings[props.kind]
  let picker!: HTMLInputElement

  return (
    <SettingsRow title={language.t(config().title)} description={language.t(config().description)}>
      <div class="flex flex-col items-end gap-1">
        <div class="flex items-center gap-2">
          <input
            ref={picker}
            type="file"
            accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.flac,.webm"
            class="hidden"
            aria-label={language.t("settings.sounds.custom.choose")}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ""

              if (file) void props.channel.choose(file)
            }}
          />
          <Button
            variant="ghost"
            size="small"
            data-action={`${config().action}-file`}
            disabled={props.channel.busy()}
            onClick={() => picker.click()}
          >
            {language.t(props.channel.busy() ? "settings.sounds.custom.saving" : "settings.sounds.custom.choose")}
          </Button>
          <Select
            data-action={config().action}
            options={props.channel.options()}
            current={props.channel.current()}
            value={(option) => option.id}
            label={(option) =>
              option.custom ? option.label : language.t(option.label)
            }
            onHighlight={props.channel.highlight}
            onSelect={props.channel.select}
            placement="bottom-end"
            gutter={6}
          />
        </div>
        <Show when={props.channel.error()}>
          <span role="alert" class="text-12-regular text-v2-text-text-muted">
            {language.t("settings.sounds.custom.error")}
          </span>
        </Show>
      </div>
    </SettingsRow>
  )
}

export const SettingsNotifications: Component = () => {
  const language = useLanguage()
  const settings = useSettings()
  const sounds = createSoundSettingsController()

  return (
    <>
      <div class="settings-tab-header">
        <div class="settings-tab-header-row">
          <div class="flex flex-col gap-1">
            <h2 class="settings-tab-title">{language.t("settings.tab.notifications")}</h2>
            <span class="text-11-regular text-v2-text-text-muted">
              {language.t("settings.notifications.description")}
            </span>
          </div>
        </div>
      </div>

      <div class="settings-tab-body settings-tab-body--sectioned">
        <div class="settings-section">
          <h3 class="settings-section-title">{language.t("settings.general.section.notifications")}</h3>
          <SettingsList>
            <SettingsRow
              title={language.t("settings.general.notifications.agent.title")}
              description={language.t("settings.general.notifications.agent.description")}
            >
              <div data-action="settings-notifications-agent">
                <Switch
                  checked={settings.notifications.agent()}
                  onChange={(checked) => settings.notifications.setAgent(checked)}
                />
              </div>
            </SettingsRow>

            <SettingsRow
              title={language.t("settings.general.notifications.permissions.title")}
              description={language.t("settings.general.notifications.permissions.description")}
            >
              <div data-action="settings-notifications-permissions">
                <Switch
                  checked={settings.notifications.permissions()}
                  onChange={(checked) => settings.notifications.setPermissions(checked)}
                />
              </div>
            </SettingsRow>

            <SettingsRow
              title={language.t("settings.general.notifications.errors.title")}
              description={language.t("settings.general.notifications.errors.description")}
            >
              <div data-action="settings-notifications-errors">
                <Switch
                  checked={settings.notifications.errors()}
                  onChange={(checked) => settings.notifications.setErrors(checked)}
                />
              </div>
            </SettingsRow>
          </SettingsList>
        </div>

        <div class="settings-section">
          <h3 class="settings-section-title">{language.t("settings.general.section.sounds")}</h3>
          <SettingsList>
            <SoundSetting kind="agent" channel={sounds.agent} />
            <SoundSetting kind="permissions" channel={sounds.permissions} />
            <SoundSetting kind="errors" channel={sounds.errors} />
          </SettingsList>
        </div>
      </div>
    </>
  )
}
