import { useEffect, useRef } from 'react'
import '../../styles/topographic-background.css'

const VERTEX_SHADER = `
  attribute vec2 a_position;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

const FRAGMENT_SHADER = `
  precision highp float;

  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_time;
  uniform float u_mouse_active;

  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec2 mod289(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec3 permute(vec3 x) {
    return mod289(((x * 34.0) + 1.0) * x);
  }

  float snoise(vec2 v) {
    const vec4 C = vec4(
      0.211324865405187,
      0.366025403784439,
      -0.577350269189626,
      0.024390243902439
    );

    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = x0.x > x0.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);

    vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
      + i.x + vec3(0.0, i1.x, 1.0)
    );

    vec3 m = max(
      0.5 - vec3(
        dot(x0, x0),
        dot(x12.xy, x12.xy),
        dot(x12.zw, x12.zw)
      ),
      0.0
    );
    m = m * m;
    m = m * m;

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;

    return 130.0 * dot(m, g);
  }

  vec3 contourFill(float value, float levels) {
    float scaled = value * levels;
    float layer = floor(scaled) / levels;
    float fraction = fract(scaled);

    vec3 deepOrange = vec3(0.86, 0.45, 0.10);
    vec3 orange = vec3(0.97, 0.62, 0.18);
    vec3 golden = vec3(1.00, 0.78, 0.28);

    vec3 color = mix(deepOrange, orange, smoothstep(0.0, 0.6, layer));
    color = mix(color, golden, smoothstep(0.6, 1.0, layer));

    float shadow = smoothstep(0.0, 0.35, fraction);
    color *= 0.78 + 0.22 * shadow;

    float edgeDistance = min(fraction, 1.0 - fraction);
    float edge = 1.0 - smoothstep(0.0, 0.055, edgeDistance);
    color -= edge * 0.055;

    return color;
  }

  void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    float aspect = u_resolution.x / u_resolution.y;
    vec2 position = st * vec2(aspect, 1.0) * 2.4;

    vec2 drift = vec2(u_time * 0.03);
    float field = snoise(position + drift) * 0.25 + 0.25;

    float angle = snoise(
      position * 0.1 + vec2(cos(u_time * 0.03), sin(u_time * 0.03))
    ) * 3.14159265;
    vec2 velocity = vec2(cos(angle), sin(angle));
    field += snoise(position + velocity) * 0.25 + 0.25;

    float value = fract(field);
    float distanceToPointer = distance(st, u_mouse);
    float influence = (1.0 - smoothstep(0.0, 0.32, distanceToPointer)) * u_mouse_active;
    value = clamp(value - 0.15 * influence, 0.0, 1.0);

    vec3 color = contourFill(value, 12.0);
    float vignette = 1.0 - smoothstep(0.15, 1.25, length((st - 0.5) * vec2(aspect, 1.0)));
    color *= 0.88 + 0.12 * vignette;

    gl_FragColor = vec4(color, 1.0);
  }
`

function compileShader(gl, type, source) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('No se pudo crear el shader.')

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Error desconocido al compilar el shader.'
    gl.deleteShader(shader)
    throw new Error(message)
  }

  return shader
}

export default function TopographicBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      powerPreference: 'low-power'
    })

    if (!gl) {
      canvas.style.display = 'none'
      return undefined
    }

    let program
    let buffer
    let animationFrame = 0
    let disposed = false
    let mouseX = 0.5
    let mouseY = 0.5
    let mouseActive = 0
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const startTime = performance.now()

    try {
      const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
      const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
      program = gl.createProgram()

      if (!program) throw new Error('No se pudo crear el programa WebGL.')

      gl.attachShader(program, vertexShader)
      gl.attachShader(program, fragmentShader)
      gl.linkProgram(program)

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'No se pudo enlazar el programa WebGL.')
      }

      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      gl.useProgram(program)

      buffer = gl.createBuffer()
      if (!buffer) throw new Error('No se pudo crear el buffer del fondo.')

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      )

      const positionLocation = gl.getAttribLocation(program, 'a_position')
      gl.enableVertexAttribArray(positionLocation)
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

      const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
      const mouseLocation = gl.getUniformLocation(program, 'u_mouse')
      const timeLocation = gl.getUniformLocation(program, 'u_time')
      const mouseActiveLocation = gl.getUniformLocation(program, 'u_mouse_active')

      gl.disable(gl.DEPTH_TEST)
      gl.disable(gl.BLEND)

      const resize = () => {
        const rect = canvas.getBoundingClientRect()
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6)
        const width = Math.max(1, Math.round(rect.width * pixelRatio))
        const height = Math.max(1, Math.round(rect.height * pixelRatio))

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width
          canvas.height = height
        }

        gl.viewport(0, 0, width, height)
        gl.useProgram(program)
        gl.uniform2f(resolutionLocation, width, height)
      }

      const render = (now = performance.now()) => {
        if (disposed) return

        gl.useProgram(program)
        gl.uniform1f(timeLocation, reducedMotion ? 0 : (now - startTime) / 1000)
        gl.uniform2f(mouseLocation, mouseX, mouseY)
        gl.uniform1f(mouseActiveLocation, mouseActive)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

        if (!reducedMotion) animationFrame = window.requestAnimationFrame(render)
      }

      const handlePointerMove = event => {
        const rect = canvas.getBoundingClientRect()
        if (!rect.width || !rect.height) return

        mouseX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
        mouseY = 1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
        mouseActive = 1

        if (reducedMotion) render()
      }

      resize()
      window.addEventListener('resize', resize, { passive: true })
      window.addEventListener('pointermove', handlePointerMove, { passive: true })
      render()

      return () => {
        disposed = true
        window.cancelAnimationFrame(animationFrame)
        window.removeEventListener('resize', resize)
        window.removeEventListener('pointermove', handlePointerMove)
        if (buffer) gl.deleteBuffer(buffer)
        if (program) gl.deleteProgram(program)
      }
    } catch (error) {
      console.error('No se pudo iniciar el fondo topográfico de GeoMax:', error)
      canvas.style.display = 'none'
      if (buffer) gl.deleteBuffer(buffer)
      if (program) gl.deleteProgram(program)
      return undefined
    }
  }, [])

  return <canvas ref={canvasRef} className="topographic-background" aria-hidden="true" />
}
