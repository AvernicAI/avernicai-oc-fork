import type { SharkKind, SharkSpec } from "./world"

export const OCEAN_SPECIES = [
  "mixed",
  "classic",
  "hammerhead",
  "zebra",
  "tiger",
  "greathammer",
  "mako",
  "thresher",
  "nurse",
] as const satisfies readonly ("mixed" | SharkKind)[]

export type OceanSpecies = (typeof OCEAN_SPECIES)[number]

const sizes = [1, 0.7, 0.84, 0.77]

export function oceanRoster(species: OceanSpecies): SharkSpec[] {
  if (species !== "mixed") return sizes.map((size) => ({ kind: species, size }))

  return OCEAN_SPECIES.flatMap((kind) => (kind === "mixed" ? [] : [{ kind, order: Math.random() }]))
    .toSorted((a, b) => a.order - b.order)
    .slice(0, sizes.length)
    .map(({ kind }, index) => ({ kind, size: sizes[index] }))
}
