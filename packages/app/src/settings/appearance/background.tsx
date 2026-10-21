import { createResource } from "solid-js"
import { createStore } from "solid-js/store"
import { Schema } from "effect"
import { createSimpleContext } from "@opencode/ui/context"
import { Persist, persisted } from "@/runtime/persistence/storage"
import { Persistence } from "@/runtime/persistence/schema"
import { resolveBlobUrl } from "@/runtime/persistence/drafts"
import { usePlatform } from "@/runtime/platform/platform"

const BackgroundSchema = Persistence.struct({
  builtin: Schema.Literals(["ocean", "silk", "waves"]),
  media: Schema.NullOr(
    Persistence.struct({
      name: Schema.String,
      kind: Schema.Literals(["image", "video"]),
      blob: Persistence.struct({ id: Schema.String, url: Persistence.optional(Schema.String) }),
    }),
  ),
})

export const { use: useBackground, provider: BackgroundProvider } = createSimpleContext({
  name: "Background",
  gate: false,
  init: () => {
    const platform = usePlatform()

    const target = Persist.prompt(Persist.global("appearance.background"))
    const key = `${target.storage}:${target.key}`
    const [state, setState, , ready] = persisted(target, BackgroundSchema, { builtin: "ocean", media: null })

    const [status, setStatus] = createStore({ busy: false, error: false })

    const [source] = createResource(
      () => state.media?.blob.id,
      async (id) => ({ id, url: await resolveBlobUrl({ id, url: state.media?.blob.url }) }),
    )

    const url = () => {
      if (source.state !== "ready" && source.state !== "refreshing") return undefined
      const loaded = source.latest

      return loaded?.id === state.media?.blob.id ? loaded.url : undefined
    }

    return {
      media: () => state.media,
      mode: () => (state.media ? ("custom" as const) : state.builtin),
      ready,
      url,
      busy: () => status.busy,
      error: () => status.error || source.state === "errored",
      failed: () => setStatus("error", true),
      reset: () => select("ocean"),
      select,
      async choose(file: File) {
        if (status.busy) return
        setStatus({ busy: true, error: false })
        const kind = file.type === "image/png" || /\.png$/i.test(file.name) ? "image" : "video"

        const supported =
          kind === "image" || file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogv|ogg)$/i.test(file.name)

        await Promise.resolve()
          .then(async () => {
            if (!supported || !platform.draftStore) throw new Error("Unsupported background")
            await validateMedia(file, kind)
            const blob = await platform.draftStore.putBlob(file)
            const media = { name: file.name, kind, blob } satisfies NonNullable<typeof state.media>
            await platform.draftStore.setDocument(key, { builtin: state.builtin, media })
            setState("media", media)
          })
          .catch(() => setStatus("error", true))
          .finally(() => setStatus("busy", false))
      },
    }

    async function select(builtin: "ocean" | "silk" | "waves") {
      if (status.busy) return
      setStatus("busy", true)
      await Promise.resolve(platform.draftStore?.setDocument(key, { builtin, media: null }))
        .then(() => {
          setState({ builtin, media: null })
          setStatus("error", false)
        })
        .catch(() => setStatus("error", true))
        .finally(() => setStatus("busy", false))
    }
  },
})

function validateMedia(file: File, kind: "image" | "video") {
  const url = URL.createObjectURL(file)

  if (kind === "image") {
    const image = new Image()
    image.src = url

    return image.decode().finally(() => URL.revokeObjectURL(url))
  }

  const video = document.createElement("video")
  video.preload = "metadata"

  return new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) resolve()
      else reject(new Error("No video track"))
    }

    video.onerror = () => reject(new Error("Unsupported video"))
    video.src = url
  }).finally(() => {
    video.removeAttribute("src")
    video.load()
    URL.revokeObjectURL(url)
  })
}
