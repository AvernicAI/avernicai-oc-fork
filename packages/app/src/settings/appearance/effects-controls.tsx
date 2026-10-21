import { For } from "solid-js"
import { Button } from "@opencode/ui/button"
import { Select } from "@opencode/ui/select"
import { OCEAN_SPECIES } from "@/home/ocean/roster"
import { Switch } from "@opencode/ui/switch"
import { SettingsRow } from "@/settings/row"
import { useLanguage } from "@/runtime/i18n/language"
import { useAppearanceEffects } from "./effects"
import { glassLens } from "./glass-lens"

const colors = ["canvas", "bubble", "ink"] as const

export function AppearanceEffectsControls() {
  const language = useLanguage()
  const effects = useAppearanceEffects()

  return (
    <>
      <SettingsRow
        title={language.t("settings.ocean.species")}
        description={language.t("settings.ocean.species.description")}
      >
        <Select
          data-action="settings-ocean-species"
          options={[...OCEAN_SPECIES]}
          current={effects.state.oceanSpecies}
          label={(species) => language.t(`settings.ocean.${species}`)}
          onSelect={(species) => species && effects.setOceanSpecies(species)}
          placement="bottom-end"
          gutter={6}
        />
      </SettingsRow>
      <SettingsRow
        title={language.t("settings.effects.glass")}
        description={language.t("settings.effects.glass.description")}
      >
        <div data-action="settings-ask-glass">
          <Switch hideLabel checked={effects.state.glass} onChange={effects.setGlass}>
            {language.t("settings.effects.glass")}
          </Switch>
        </div>
      </SettingsRow>
      <SettingsRow
        title={language.t("settings.effects.transparency")}
        description={language.t("settings.effects.transparency.description")}
      >
        <div class="appearance-glass-slider" data-action="settings-glass-transparency">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            aria-label={language.t("settings.effects.transparency")}
            value={effects.state.glassTransparency}
            disabled={!effects.state.glass}
            onInput={(event) => effects.setGlassTransparency(event.currentTarget.valueAsNumber)}
          />
          <output>{effects.state.glassTransparency}%</output>
        </div>
      </SettingsRow>
      <SettingsRow
        title={language.t("settings.effects.blur")}
        description={language.t("settings.effects.blur.description")}
      >
        <div class="appearance-glass-slider" data-action="settings-glass-blur">
          <input
            type="range"
            min="0"
            max="32"
            step="1"
            aria-label={language.t("settings.effects.blur")}
            value={effects.state.glassBlur}
            disabled={!effects.state.glass}
            onInput={(event) => effects.setGlassBlur(event.currentTarget.valueAsNumber)}
          />
          <output>{effects.state.glassBlur}px</output>
        </div>
      </SettingsRow>
      <div class="appearance-glass-preview" aria-label={language.t("settings.effects.glassPreview")}>
        <div ref={glassLens} class="appearance-glass-sample">{language.t("settings.effects.glassPreview.prompt")}</div>
      </div>
      <SettingsRow
        title={language.t("settings.effects.colors")}
        description={language.t("settings.effects.colors.description")}
      >
        <div class="flex items-center gap-3" data-action="settings-message-colors">
          <Button variant="outline" onClick={effects.panda}>
            {language.t("settings.effects.panda")}
          </Button>
          <Switch hideLabel checked={effects.state.customColors} onChange={effects.setCustomColors}>
            {language.t("settings.effects.colors")}
          </Switch>
        </div>
      </SettingsRow>
      <For each={colors}>
        {(key) => (
          <SettingsRow
            title={language.t(`settings.effects.${key}`)}
            description={language.t(`settings.effects.${key}.description`)}
          >
            <input
              type="color"
              value={effects.state[key]}
              disabled={!effects.state.customColors}
              aria-label={language.t(`settings.effects.${key}`)}
              class="appearance-color-picker"
              onInput={(event) => effects.setColor(key, event.currentTarget.value)}
            />
          </SettingsRow>
        )}
      </For>
      <div
        class="appearance-chat-preview"
        aria-label={language.t("settings.effects.preview")}
        style={{
          "background-color": effects.state.customColors ? effects.state.canvas : "var(--v2-background-bg-base)",
        }}
      >
        <div
          style={{
            background: effects.state.customColors ? effects.state.bubble : "var(--v2-background-bg-layer-02)",
            color: effects.state.customColors ? effects.state.ink : "var(--v2-text-text-base)",
          }}
        >
          {language.t("settings.effects.preview.user")}
        </div>
        <div
          style={{
            background: effects.state.customColors ? effects.state.bubble : "var(--v2-background-bg-layer-02)",
            color: effects.state.customColors ? effects.state.ink : "var(--v2-text-text-base)",
          }}
        >
          {language.t("settings.effects.preview.assistant")}
        </div>
      </div>
    </>
  )
}
