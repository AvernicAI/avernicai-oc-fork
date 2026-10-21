import { displayName } from "@opencode/ui/project-avatar"
import { For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { useLanguage } from "@/runtime/i18n/language"
import type { HomeController } from "../model"
import type { HomeProjectsController } from "../projects/controller"
import { glassLens } from "@/settings/appearance/glass-lens"
import { OceanBackdrop } from "./backdrop"

export function HomeOcean(props: { home: HomeController; projects: HomeProjectsController }) {
  const language = useLanguage()
  const [state, setState] = createStore({ prompt: "" })

  const submit = () => {
    if (!state.prompt.trim() || !props.home.project.newSession()) return
    props.home.project.startPrompt(state.prompt)
  }

  return (
    <section class="ocean-home-hero">
      <OceanBackdrop />
      <div class="ocean-home-projects">
        <Show
          when={props.home.project.list().length > 0}
          fallback={
            <button
              type="button"
              class="ocean-project-picker"
              onClick={() => {
                const server = props.home.server.focused()

                if (server) props.projects.project.choose(server)
              }}
            >
              {language.t("command.project.open")}
            </button>
          }
        >
          <select
            class="ocean-project-picker"
            aria-label={language.t("home.ocean.chooseProject")}
            value={props.home.project.newSession()?.worktree}
            onChange={(event) => {
              const server = props.home.server.focused()

              if (server) props.home.project.select(server, event.currentTarget.value)
            }}
          >
            <For each={props.home.project.list()}>
              {(project) => <option value={project.worktree}>{displayName(project)}</option>}
            </For>
          </select>
        </Show>
      </div>
      <div class="ocean-center">
        <div class="ocean-content">
          <h1 class="ocean-heading">{language.t("home.ocean.heading")}</h1>
          <form
            ref={glassLens}
            class="ocean-prompt"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <textarea
              aria-label={language.t("home.ocean.placeholder")}
              placeholder={language.t("home.ocean.placeholder")}
              value={state.prompt}
              onInput={(event) => setState("prompt", event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey || event.isComposing) return
                event.preventDefault()
                submit()
              }}
            />
            <div class="ocean-prompt-footer">
              <span class="ocean-project">
                <Show when={props.home.project.newSession()} fallback={language.t("home.ocean.project")}>
                  {(project) => displayName(project())}
                </Show>
              </span>
              <button
                class="ocean-submit"
                type="submit"
                aria-label={language.t("home.ocean.continue")}
                title={language.t("home.ocean.continue")}
                disabled={!state.prompt.trim() || !props.home.project.newSession()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path d="M12 19V5m-6 6 6-6 6 6" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
      <button
        type="button"
        class="ocean-recent"
        onClick={() => document.getElementById("home-library")?.scrollIntoView({ block: "start" })}
      >
        {language.t("home.ocean.recent")} <span aria-hidden="true">↓</span>
      </button>
    </section>
  )
}
