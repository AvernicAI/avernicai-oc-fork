import { onCleanup } from "solid-js"

const svg = "http://www.w3.org/2000/svg"
const lenses = new Set<() => void>()

// Only Chromium (including Electron) renders SVG filters inside `backdrop-filter`; WebKit and Gecko
// would drop the whole declaration, so other engines keep the CSS-only glass.
const supported = typeof navigator !== "undefined" && /Chrome\//.test(navigator.userAgent)

let defs: SVGSVGElement | undefined
let next = 0

/** Bends the backdrop along the element's rounded edge like a glass lens while ask glass is enabled. */
export function glassLens(element: HTMLElement) {
  if (!supported) return

  const id = `ask-glass-lens-${next++}`
  const filter = document.createElementNS(svg, "filter")
  const image = document.createElementNS(svg, "feImage")
  const displacement = document.createElementNS(svg, "feDisplacementMap")
  const size = { width: 0, height: 0, drawn: "" }

  filter.id = id
  filter.setAttribute("filterUnits", "userSpaceOnUse")
  filter.setAttribute("primitiveUnits", "userSpaceOnUse")
  filter.setAttribute("color-interpolation-filters", "sRGB")
  image.setAttribute("result", "map")
  image.setAttribute("preserveAspectRatio", "none")
  displacement.setAttribute("in", "SourceGraphic")
  displacement.setAttribute("in2", "map")
  displacement.setAttribute("xChannelSelector", "R")
  displacement.setAttribute("yChannelSelector", "G")
  filter.append(image, displacement)
  container().append(filter)

  const draw = () => {
    if (document.documentElement.dataset.askGlass !== "true" || !size.width || !size.height) return
    const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0
    const key = `${size.width}x${size.height}r${radius}`

    if (key === size.drawn) return
    size.drawn = key
    const band = Math.min(28, size.width / 2, size.height / 2)

    for (const node of [filter, image]) {
      node.setAttribute("x", "0")
      node.setAttribute("y", "0")
      node.setAttribute("width", String(size.width))
      node.setAttribute("height", String(size.height))
    }
    image.setAttribute("href", displacementMap(size.width, size.height, radius, band))
    displacement.setAttribute("scale", String(band * 1.6))
    element.style.setProperty("--ask-glass-lens", `url(#${id})`)
  }

  const observer = new ResizeObserver(([entry]) => {
    const box = entry.borderBoxSize[0]
    size.width = Math.round(box.inlineSize)
    size.height = Math.round(box.blockSize)
    draw()
  })

  observer.observe(element)
  lenses.add(draw)
  onCleanup(() => {
    observer.disconnect()
    lenses.delete(draw)
    filter.remove()
    element.style.removeProperty("--ask-glass-lens")
  })
}

/** Draws lenses that were skipped while ask glass was disabled. */
export function refreshGlassLenses() {
  lenses.forEach((draw) => draw())
}

function container() {
  if (defs?.isConnected) return defs
  defs = document.createElementNS(svg, "svg")
  defs.setAttribute("aria-hidden", "true")
  defs.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none"
  document.body.append(defs)

  return defs
}

// Encodes, per pixel, how far to sample the backdrop toward the center: zero across the flat face,
// rising steeply inside `band` pixels of the rounded edge the way a convex glass rim refracts.
function displacementMap(width: number, height: number, radius: number, band: number) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")!
  const image = context.createImageData(width, height)
  const r = Math.min(radius, width / 2, height / 2)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + 0.5 - width / 2
      const py = y + 0.5 - height / 2
      const qx = Math.abs(px) - (width / 2 - r)
      const qy = Math.abs(py) - (height / 2 - r)
      const corner = qx > 0 && qy > 0
      const length = Math.hypot(qx, qy) || 1
      const depth = corner ? r - length : r - Math.max(qx, qy)
      const nx = corner ? (qx / length) * Math.sign(px) : qx > qy ? Math.sign(px) : 0
      const ny = corner ? (qy / length) * Math.sign(py) : qx > qy ? 0 : Math.sign(py)
      const strength = (1 - Math.min(Math.max(depth / band, 0), 1)) ** 2
      const index = (y * width + x) * 4
      image.data[index] = 128 - nx * strength * 127
      image.data[index + 1] = 128 - ny * strength * 127
      image.data[index + 2] = 128
      image.data[index + 3] = 255
    }
  }

  context.putImageData(image, 0, 0)

  return canvas.toDataURL()
}
