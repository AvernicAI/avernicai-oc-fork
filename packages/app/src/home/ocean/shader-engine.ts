import silk from "./silk.frag?raw"
import waves from "./waves.frag?raw"

const vertex = `attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`

// One triangle, no textures or pointer listeners. Draw on every display frame; cap retina scale at 2.
export function createShader(canvas: HTMLCanvasElement, kind: "silk" | "waves") {
  const preset =
    kind === "waves"
      ? {
          fragment: waves,
          colors: [0.063, 0, 0.169, 0.353, 0.094, 0.604, 0.616, 0.306, 0.867, 0.878, 0.667, 1],
          speed: -0.73,
          shape: [2, 0.54, 0.47, 0.04],
          surface: [1.54, 1.16, 0, 1],
          finish: [0, 0.21, 0.002, 0.1],
          transform: [4012, 5.65, 0.12, 0],
          space: [0.11, -0.19, 0, 0],
        }
      : {
          fragment: silk,
          colors: [0.008, 0.004, 0.039, 0.016, 0.02, 0.18, 0.239, 0.173, 0.553, 0.569, 0.42, 0.749],
          speed: 0.76,
          shape: [1.26, 0.28, 0.5, 0],
          surface: [2.4, 1.11, 0, 1],
          finish: [0, 0, 0, 0.05],
          transform: [1581, 0, 0, 0],
          space: [0, 0, 0, 0],
        }
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false })
  if (!gl) return

  let program: WebGLProgram | undefined
  let buffer: WebGLBuffer | undefined
  let scene: WebGLUniformLocation | null = null
  let frame = 0
  let previous = 0
  let elapsed = 0
  let painted = false
  let visible = true
  let lost = false
  const motion = matchMedia("(prefers-reduced-motion: reduce)")

  const release = () => {
    if (buffer) gl.deleteBuffer(buffer)
    if (program) gl.deleteProgram(program)
    buffer = undefined
    program = undefined
  }

  const initialize = () => {
    const shaders = [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].map((type, index) => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, index === 0 ? vertex : preset.fragment)
      gl.compileShader(shader)
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
      gl.deleteShader(shader)
      return null
    })
    const next = gl.createProgram()
    if (!next || shaders.some((shader) => !shader)) {
      shaders.forEach((shader) => shader && gl.deleteShader(shader))
      if (next) gl.deleteProgram(next)
      return
    }
    shaders.forEach((shader) => shader && gl.attachShader(next, shader))
    gl.linkProgram(next)
    shaders.forEach((shader) => shader && gl.deleteShader(shader))
    if (!gl.getProgramParameter(next, gl.LINK_STATUS)) {
      gl.deleteProgram(next)
      return
    }
    program = next
    buffer = gl.createBuffer() ?? undefined
    if (!buffer) {
      release()
      return
    }
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, "position")
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    gl.uniform3fv(
      gl.getUniformLocation(program, "u_colors[0]"),
      new Float32Array([...preset.colors, ...Array(12).fill(0)]),
    )
    for (const name of ["shape", "surface", "finish", "transform", "space"] as const) {
      gl.uniform4fv(gl.getUniformLocation(program, `u_${name}`), new Float32Array(preset[name]))
    }
    gl.uniform4f(gl.getUniformLocation(program, "u_cursor"), 0, 2, 0.65, 0.46)
    scene = gl.getUniformLocation(program, "u_scene")
  }

  const draw = () => {
    if (!program || lost) return
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform4f(scene, canvas.width, canvas.height, elapsed * preset.speed, 4)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    painted = true
  }
  const running = () => visible && !document.hidden && !motion.matches && !lost && !!program
  const tick = (now: number) => {
    frame = 0
    if (!running()) return
    if (previous) elapsed += Math.min((now - previous) / 1000, 0.1)
    previous = now
    draw()
    frame = requestAnimationFrame(tick)
  }
  const schedule = () => {
    cancelAnimationFrame(frame)
    frame = 0
    previous = 0
    if (running()) frame = requestAnimationFrame(tick)
    else if (!painted && visible && !document.hidden) draw()
  }
  const resize = () => {
    const ratio = Math.min(devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio))
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio))
    if (width === canvas.width && height === canvas.height) return
    canvas.width = width
    canvas.height = height
    draw()
  }
  const contextLost = (event: Event) => {
    event.preventDefault()
    lost = true
    schedule()
  }
  const contextRestored = () => {
    lost = false
    release()
    initialize()
    canvas.style.visibility = program ? "visible" : "hidden"
    resize()
    draw()
    schedule()
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    schedule()
  })
  const size = new ResizeObserver(resize)
  initialize()
  canvas.style.visibility = program ? "visible" : "hidden"
  resize()
  draw()
  observer.observe(canvas)
  size.observe(canvas)
  document.addEventListener("visibilitychange", schedule)
  motion.addEventListener("change", schedule)
  canvas.addEventListener("webglcontextlost", contextLost)
  canvas.addEventListener("webglcontextrestored", contextRestored)
  schedule()

  return {
    destroy() {
      cancelAnimationFrame(frame)
      observer.disconnect()
      size.disconnect()
      document.removeEventListener("visibilitychange", schedule)
      motion.removeEventListener("change", schedule)
      canvas.removeEventListener("webglcontextlost", contextLost)
      canvas.removeEventListener("webglcontextrestored", contextRestored)
      release()
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    },
  }
}
