import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  CheckCircle2,
  Crosshair,
  Eye,
  Flag,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  StepForward,
  Timer,
  Trophy,
} from 'lucide-react'
import type { LabMission } from '@/types/content'
import {
  checkPrediction,
  describeRelativeMotion,
  predictPosition,
  relativeVelocity,
} from '@/lib/motion'
import { formatQuantity, UNITS } from '@/lib/units'
import { useProgress } from '@/state/progress'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { ActionButton } from '@/components/ui/ui'
import { Measure, RichText, Tex } from '@/components/math/Math'
import './MotionLab.css'

/**
 * «مختبر الحركة والسكون» — an interactive uniform-motion laboratory.
 *
 * Students drive two cars on a straight two-lane track, switch the frame of
 * reference between the ground and the moving blue car, read live
 * measurements, watch a distance–time graph grow, and predict future
 * positions. All physics goes through the pure helpers in `@/lib/motion`.
 *
 * The simulation canvas uses the international LTR axis convention
 * (position increases to the right) inside a `dir="ltr"` region, matching
 * physics diagrams; the surrounding UI remains fully RTL Arabic.
 */

type Frame = 'ground' | 'blue'

interface Strobe {
  xRed: number
  xBlue: number
}

interface GraphPoint {
  t: number
  dRed: number
  dBlue: number
}

interface Sim {
  t: number
  xRed: number
  xBlue: number
  strobes: Strobe[]
  graph: GraphPoint[]
  lastStrobe: number
  lastSample: number
  cameraX: number
}

interface Readouts {
  t: number
  dRed: number
  gap: number
  vRel: number
}

const freshSim = (): Sim => ({
  t: 0,
  xRed: 0,
  xBlue: 0,
  strobes: [{ xRed: 0, xBlue: 0 }],
  graph: [{ t: 0, dRed: 0, dBlue: 0 }],
  lastStrobe: 0,
  lastSample: 0,
  cameraX: -14,
})

/** Rounds to at most one decimal, for inline LaTeX substitutions. */
function round(value: number): number {
  return Math.round(value * 10) / 10
}

/** Deterministic pseudo-random from an integer seed (stable scenery). */
function seeded(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function MotionLab({
  entryId,
  missions,
}: {
  entryId: string
  missions: LabMission[]
}) {
  const { state, completeMission } = useProgress()
  const reducedMotion = useReducedMotion()

  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const graphRef = useRef<HTMLCanvasElement>(null)
  const simRef = useRef<Sim>(freshSim())

  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const [vRed, setVRed] = useState(8)
  const [vBlue, setVBlue] = useState(0)
  const [frame, setFrame] = useState<Frame>('ground')
  const [readouts, setReadouts] = useState<Readouts>({ t: 0, dRed: 0, gap: 0, vRel: 8 })

  // Prediction challenge
  const [predictOn, setPredictOn] = useState(false)
  const [predictDt, setPredictDt] = useState(4)
  const [guess, setGuess] = useState<number | null>(null)
  const [guessInput, setGuessInput] = useState('')
  const [predictMsg, setPredictMsg] = useState<{ ok: boolean; text: ReactNode } | null>(null)

  // Mission tracking refs
  const speedsTried = useRef<Set<number>>(new Set())
  const restTimer = useRef(0)
  const guessRef = useRef<number | null>(null)
  guessRef.current = guess

  const controlsRef = useRef({ running, vRed, vBlue, frame })
  controlsRef.current = { running, vRed, vBlue, frame }

  const fireMission = useCallback(
    (id: string) => {
      const mission = missions.find((m) => m.id === id)
      if (mission) completeMission(mission.id, entryId, mission.xp, mission.title)
    },
    [missions, completeMission, entryId],
  )
  const fireRef = useRef(fireMission)
  fireRef.current = fireMission

  /* ------------------------------------------------ simulation step */
  const advance = useCallback((dtTotal: number) => {
    const sim = simRef.current
    const { vRed: vr, vBlue: vb, frame: fr } = controlsRef.current
    const steps = Math.max(1, Math.ceil(dtTotal / 0.05))
    const dt = dtTotal / steps
    for (let i = 0; i < steps; i++) {
      sim.t += dt
      sim.xRed += vr * dt
      sim.xBlue += vb * dt
      if (sim.t - sim.lastStrobe >= 1) {
        sim.lastStrobe = Math.floor(sim.t)
        sim.strobes.push({ xRed: sim.xRed, xBlue: sim.xBlue })
        if (sim.strobes.length > 400) sim.strobes.shift()
      }
      if (sim.t - sim.lastSample >= 0.25) {
        sim.lastSample = sim.t
        sim.graph.push({ t: sim.t, dRed: sim.xRed, dBlue: sim.xBlue })
        if (sim.graph.length > 1200) sim.graph.shift()
      }
    }
    // Mission: tried 3 distinct red speeds while running
    if (vr >= 0) {
      speedsTried.current.add(vr)
      if (speedsTried.current.size >= 3) fireRef.current('motion-try-speeds')
    }
    // Mission: sustained relative rest observed from the blue car
    if (fr === 'blue' && vr === vb && vr > 0) {
      restTimer.current += dtTotal
      if (restTimer.current >= 2) fireRef.current('motion-relative-rest')
    } else {
      restTimer.current = 0
    }
  }, [])

  /* ------------------------------------------------ drawing */
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.clientWidth
    const H = canvas.clientHeight
    if (W === 0 || H === 0) return

    const sim = simRef.current
    const { vRed: vr, vBlue: vb, frame: fr } = controlsRef.current
    const ppm = Math.min(9, Math.max(3.4, W / 112)) // pixels per metre
    const visibleM = W / ppm

    // camera
    const targetCam =
      fr === 'blue' ? sim.xBlue - visibleM * 0.5 : Math.max(-14, sim.xRed - visibleM * 0.32)
    sim.cameraX += (targetCam - sim.cameraX) * 0.12
    if (Math.abs(targetCam - sim.cameraX) < 0.01) sim.cameraX = targetCam
    const cam = sim.cameraX
    const toX = (worldX: number) => (worldX - cam) * ppm

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.6)
    sky.addColorStop(0, '#0A1128')
    sky.addColorStop(0.7, '#1C2B52')
    sky.addColorStop(1, '#2E4A7D')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)

    // stars
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    for (let i = 0; i < 46; i++) {
      const sx = seeded(i * 3 + 1) * W
      const sy = seeded(i * 7 + 2) * H * 0.34
      const r = seeded(i * 13 + 5) * 1.4 + 0.4
      ctx.globalAlpha = 0.35 + seeded(i * 17) * 0.6
      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // moon
    ctx.fillStyle = '#F8F3D9'
    ctx.beginPath()
    ctx.arc(W - 54, 40, 15, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(248,243,217,0.16)'
    ctx.beginPath()
    ctx.arc(W - 54, 40, 24, 0, Math.PI * 2)
    ctx.fill()

    const horizon = H * 0.52

    // distant hills (parallax 0.15)
    ctx.fillStyle = '#16233F'
    ctx.beginPath()
    ctx.moveTo(0, horizon)
    const hillOff = (cam * ppm * 0.15) % 240
    for (let x = -240; x < W + 240; x += 24) {
      const idx = Math.floor((x + hillOff) / 24)
      const y = horizon - 14 - seeded(idx) * 30
      ctx.lineTo(x - hillOff + 12, y)
      ctx.lineTo(x - hillOff + 24, horizon)
    }
    ctx.lineTo(W, horizon)
    ctx.closePath()
    ctx.fill()

    // trees strip (parallax 0.45)
    const treeOff = (cam * ppm * 0.45) % 90
    for (let x = -90; x < W + 90; x += 90) {
      const idx = Math.floor((x + cam * ppm * 0.45) / 90)
      const tx = x - treeOff + seeded(idx * 3) * 30
      const th = 20 + seeded(idx * 7) * 14
      ctx.fillStyle = '#1E3A2F'
      ctx.beginPath()
      ctx.arc(tx, horizon - th + 8, th * 0.62, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(tx - 2, horizon - th + 8, 4, th)
    }

    // ground
    ctx.fillStyle = '#141D33'
    ctx.fillRect(0, horizon, W, H - horizon)

    // road
    const roadTop = H * 0.56
    const roadBottom = H * 0.94
    ctx.fillStyle = '#242E47'
    ctx.fillRect(0, roadTop, W, roadBottom - roadTop)
    ctx.fillStyle = 'rgba(248,250,252,0.85)'
    ctx.fillRect(0, roadTop, W, 3)
    ctx.fillRect(0, roadBottom - 3, W, 3)

    // lane divider dashes (world-anchored)
    const laneY = (roadTop + roadBottom) / 2
    ctx.fillStyle = 'rgba(245,179,1,0.9)'
    const dashStart = Math.floor(cam / 6) * 6
    for (let m = dashStart; m < cam + visibleM + 6; m += 6) {
      ctx.fillRect(toX(m), laneY - 2, 3 * ppm * 0.55, 4)
    }

    // signposts every 20 m + start line
    ctx.textAlign = 'center'
    const signStart = Math.max(0, Math.floor(cam / 20) * 20)
    for (let m = signStart; m < cam + visibleM + 20; m += 20) {
      const x = toX(m)
      if (x < -30 || x > W + 30) continue
      ctx.strokeStyle = 'rgba(203,213,225,0.8)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, roadTop)
      ctx.lineTo(x, roadTop - 26)
      ctx.stroke()
      ctx.fillStyle = '#0F1B33'
      ctx.strokeStyle = 'rgba(125,211,252,0.9)'
      // Units on the canvas are English SI symbols too (m).
      const label = formatQuantity(m, UNITS.metre, 0)
      ctx.font = '700 11px "Readex Pro", sans-serif'
      const tw = ctx.measureText(label).width + 12
      ctx.beginPath()
      ctx.roundRect(x - tw / 2, roadTop - 46, tw, 20, 5)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#BAE6FD'
      ctx.fillText(label, x, roadTop - 32)
      // tick on road
      ctx.fillStyle = 'rgba(248,250,252,0.35)'
      ctx.fillRect(x - 1, roadTop + 4, 2, 8)
    }
    // start line
    const startX = toX(0)
    if (startX > -20 && startX < W + 20) {
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.fillRect(startX - 2, roadTop, 4, roadBottom - roadTop)
      ctx.fillStyle = '#F5B301'
      ctx.beginPath()
      ctx.moveTo(startX, roadTop - 58)
      ctx.lineTo(startX + 16, roadTop - 52)
      ctx.lineTo(startX, roadTop - 46)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#F5B301'
      ctx.beginPath()
      ctx.moveTo(startX, roadTop - 58)
      ctx.lineTo(startX, roadTop - 26)
      ctx.stroke()
    }

    const redLaneY = roadTop + (roadBottom - roadTop) * 0.27
    const blueLaneY = roadTop + (roadBottom - roadTop) * 0.74

    // strobe dots for the red car (one per second)
    for (const s of sim.strobes) {
      const wx = fr === 'blue' ? sim.xBlue + (s.xRed - s.xBlue) : s.xRed
      const x = toX(wx)
      if (x < -10 || x > W + 10) continue
      ctx.fillStyle = 'rgba(248,113,113,0.95)'
      ctx.beginPath()
      ctx.arc(x, redLaneY + 16, 3.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(248,113,113,0.25)'
      ctx.beginPath()
      ctx.arc(x, redLaneY + 16, 6.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // prediction marker
    const g = guessRef.current
    if (g !== null) {
      const x = toX(g)
      ctx.strokeStyle = '#F5B301'
      ctx.setLineDash([5, 5])
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, roadTop - 8)
      ctx.lineTo(x, roadBottom)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#F5B301'
      ctx.beginPath()
      ctx.moveTo(x, roadTop - 26)
      ctx.lineTo(x + 18, roadTop - 19)
      ctx.lineTo(x, roadTop - 12)
      ctx.closePath()
      ctx.fill()
    }

    const drawCar = (
      worldX: number,
      laneYPos: number,
      body: string,
      dark: string,
      label: string,
      speedForArrow: number,
    ) => {
      const x = toX(worldX)
      const carW = Math.max(52, ppm * 7)
      const carH = carW * 0.3
      const wheelR = carW * 0.11
      const baseY = laneYPos + carH * 0.5

      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.beginPath()
      ctx.ellipse(x, baseY + wheelR * 0.9, carW * 0.52, 5, 0, 0, Math.PI * 2)
      ctx.fill()

      // body
      ctx.fillStyle = body
      ctx.beginPath()
      ctx.roundRect(x - carW / 2, baseY - carH, carW, carH, carH * 0.32)
      ctx.fill()
      // cabin
      ctx.fillStyle = dark
      ctx.beginPath()
      ctx.roundRect(x - carW * 0.24, baseY - carH * 1.72, carW * 0.46, carH * 0.85, carH * 0.3)
      ctx.fill()
      // windows
      ctx.fillStyle = 'rgba(186,230,253,0.95)'
      ctx.beginPath()
      ctx.roundRect(x - carW * 0.19, baseY - carH * 1.62, carW * 0.17, carH * 0.6, 3)
      ctx.roundRect(x + carW * 0.02, baseY - carH * 1.62, carW * 0.15, carH * 0.6, 3)
      ctx.fill()
      // headlight
      ctx.fillStyle = '#FDE68A'
      ctx.beginPath()
      ctx.arc(x + carW / 2 - 3, baseY - carH * 0.45, 3, 0, Math.PI * 2)
      ctx.fill()

      // wheels (rotate with travelled distance)
      const angle = (worldX / 0.35) % (Math.PI * 2)
      for (const dx of [-carW * 0.3, carW * 0.3]) {
        const wy = baseY + wheelR * 0.35
        ctx.fillStyle = '#0B1226'
        ctx.beginPath()
        ctx.arc(x + dx, wy, wheelR, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#94A3B8'
        ctx.lineWidth = 2
        for (let s = 0; s < 3; s++) {
          const a = angle + (s * Math.PI * 2) / 3
          ctx.beginPath()
          ctx.moveTo(x + dx, wy)
          ctx.lineTo(x + dx + Math.cos(a) * wheelR * 0.85, wy + Math.sin(a) * wheelR * 0.85)
          ctx.stroke()
        }
      }

      // label (clamped so it never clips at the canvas edges)
      ctx.font = '700 11px "Readex Pro", sans-serif'
      const tw = ctx.measureText(label).width + 14
      const lx = Math.min(Math.max(x, tw / 2 + 4), W - tw / 2 - 4)
      ctx.fillStyle = 'rgba(11,18,38,0.82)'
      ctx.beginPath()
      ctx.roundRect(lx - tw / 2, baseY - carH * 1.72 - 26, tw, 19, 9)
      ctx.fill()
      ctx.fillStyle = '#F1F5F9'
      ctx.fillText(label, lx, baseY - carH * 1.72 - 13)

      // velocity vector arrow (in the current frame)
      if (speedForArrow !== 0) {
        const len = Math.min(90, Math.abs(speedForArrow) * 5)
        const dir = Math.sign(speedForArrow)
        const ay = baseY - carH * 1.72 - 38
        const ax = x + dir * (carW * 0.18)
        ctx.strokeStyle = '#F5B301'
        ctx.fillStyle = '#F5B301'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(ax + dir * len, ay)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(ax + dir * len, ay)
        ctx.lineTo(ax + dir * (len - 8), ay - 4.5)
        ctx.lineTo(ax + dir * (len - 8), ay + 4.5)
        ctx.closePath()
        ctx.fill()
        ctx.font = '700 10px "Readex Pro", sans-serif'
        ctx.fillText(
          formatQuantity(Math.abs(speedForArrow), UNITS.metresPerSecond, 0),
          ax + dir * (len / 2),
          ay - 7,
        )
      }
    }

    const vRelNow = relativeVelocity(vr, vb)
    drawCar(
      sim.xRed,
      redLaneY,
      '#EF4444',
      '#B91C1C',
      'الحمراء · الهدف',
      fr === 'blue' ? vRelNow : vr,
    )
    drawCar(sim.xBlue, blueLaneY, '#2F7CF6', '#1D4ED8', 'الزرقاء · المراقب', fr === 'blue' ? 0 : vb)

    // frame vignette cue
    if (fr === 'blue') {
      ctx.strokeStyle = 'rgba(47,124,246,0.55)'
      ctx.lineWidth = 3
      ctx.setLineDash([10, 8])
      ctx.strokeRect(6, 6, W - 12, H - 12)
      ctx.setLineDash([])
    }
  }, [])

  const drawGraph = useCallback(() => {
    const canvas = graphRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.clientWidth
    const H = canvas.clientHeight
    if (W === 0 || H === 0) return
    const sim = simRef.current

    ctx.fillStyle = '#0E1730'
    ctx.fillRect(0, 0, W, H)

    const padL = 38
    const padR = 12
    const padT = 12
    const padB = 24
    const iw = W - padL - padR
    const ih = H - padT - padB

    const maxT = Math.max(10, sim.t * 1.15)
    const maxD = Math.max(25, sim.xRed * 1.2, sim.xBlue * 1.2)
    const gx = (t: number) => padL + (t / maxT) * iw
    const gy = (d: number) => padT + ih - (d / maxD) * ih

    // grid
    ctx.strokeStyle = 'rgba(148,163,184,0.16)'
    ctx.lineWidth = 1
    ctx.font = '600 9.5px "Readex Pro", sans-serif'
    ctx.fillStyle = '#8B99BA'
    ctx.textAlign = 'center'
    const tStep = maxT > 40 ? 10 : maxT > 20 ? 5 : 2
    for (let t = 0; t <= maxT; t += tStep) {
      ctx.beginPath()
      ctx.moveTo(gx(t), padT)
      ctx.lineTo(gx(t), padT + ih)
      ctx.stroke()
      ctx.fillText(String(Math.round(t)), gx(t), H - 8)
    }
    ctx.textAlign = 'right'
    const dStep = maxD > 160 ? 40 : maxD > 80 ? 20 : 10
    for (let d = 0; d <= maxD; d += dStep) {
      ctx.beginPath()
      ctx.moveTo(padL, gy(d))
      ctx.lineTo(padL + iw, gy(d))
      ctx.stroke()
      ctx.fillText(String(Math.round(d)), padL - 5, gy(d) + 3)
    }

    // axes
    ctx.strokeStyle = 'rgba(226,232,240,0.55)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(padL, padT)
    ctx.lineTo(padL, padT + ih)
    ctx.lineTo(padL + iw, padT + ih)
    ctx.stroke()

    const plot = (key: 'dRed' | 'dBlue', color: string, width: number) => {
      if (sim.graph.length < 2) return
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.beginPath()
      sim.graph.forEach((p, i) => {
        const x = gx(p.t)
        const y = gy(p[key])
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      const last = sim.graph[sim.graph.length - 1]
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(gx(last.t), gy(last[key]), 3.2, 0, Math.PI * 2)
      ctx.fill()
    }
    plot('dBlue', 'rgba(96,165,250,0.75)', 1.6)
    plot('dRed', '#F87171', 2.4)

    ctx.fillStyle = '#A9B6D8'
    ctx.textAlign = 'right'
    ctx.font = '700 10px "Readex Pro", sans-serif'
    // Axis names stay Arabic; the variable and its unit symbol are English.
    ctx.fillText('المسافة من البداية  d (m)', padL + 132, padT + 4)
    ctx.fillText('الزمن  t (s)', W - padR, H - 8)
  }, [])

  /* ------------------------------------------------ lifecycle */
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let readoutAcc = 0

    const loop = (now: number) => {
      const rawDt = Math.min(0.06, (now - last) / 1000)
      last = now
      if (controlsRef.current.running) {
        advance(rawDt)
        readoutAcc += rawDt
        if (readoutAcc >= 0.12) {
          readoutAcc = 0
          const sim = simRef.current
          const { vRed: vr, vBlue: vb } = controlsRef.current
          setReadouts({
            t: sim.t,
            dRed: sim.xRed,
            gap: Math.abs(sim.xRed - sim.xBlue),
            vRel: relativeVelocity(vr, vb),
          })
        }
      }
      draw()
      drawGraph()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [advance, draw, drawGraph])

  // Canvas sizing (DPR aware)
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const fit = (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w === 0 || h === 0) return
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      const ctx = canvas.getContext('2d')
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    fit(canvasRef.current)
    fit(graphRef.current)
    draw()
    drawGraph()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      fit(canvasRef.current)
      fit(graphRef.current)
      draw()
      drawGraph()
    })
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [draw, drawGraph])

  /* ------------------------------------------------ controls */
  const toggleRun = () => {
    setStarted(true)
    setRunning((r) => !r)
  }

  const stepOnce = () => {
    setStarted(true)
    setRunning(false)
    advance(1)
    const sim = simRef.current
    setReadouts({
      t: sim.t,
      dRed: sim.xRed,
      gap: Math.abs(sim.xRed - sim.xBlue),
      vRel: relativeVelocity(vRed, vBlue),
    })
    draw()
    drawGraph()
  }

  const reset = () => {
    simRef.current = freshSim()
    speedsTried.current = new Set()
    restTimer.current = 0
    setRunning(false)
    setStarted(false)
    setGuess(null)
    setGuessInput('')
    setPredictMsg(null)
    setReadouts({ t: 0, dRed: 0, gap: 0, vRel: relativeVelocity(vRed, vBlue) })
    draw()
    drawGraph()
  }

  const changeFrame = (next: Frame) => {
    setFrame(next)
    if (next === 'blue') fireMission('motion-switch-frame')
  }

  /* ------------------------------------------------ prediction */
  const startPrediction = () => {
    setRunning(false)
    setPredictOn(true)
    setGuess(null)
    setGuessInput('')
    setPredictMsg(null)
    setPredictDt(3 + Math.floor(Math.random() * 4)) // 3–6 s
  }

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!predictOn) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ppm = Math.min(9, Math.max(3.4, canvas.clientWidth / 112))
    const worldX = simRef.current.cameraX + (e.clientX - rect.left) / ppm
    const rounded = Math.round(worldX)
    setGuess(rounded)
    setGuessInput(String(rounded))
    setPredictMsg(null)
  }

  const checkGuess = () => {
    const sim = simRef.current
    const g = guessInput.trim() === '' ? guess : Number(guessInput)
    if (g === null || g === undefined || Number.isNaN(g)) {
      setPredictMsg({
        ok: false,
        text: (
          <>
            حدّد موضعاً أولاً: اضغط على المسار أو أدخل رقماً — المسافة بوحدة{' '}
            <span className="unit">m</span>.
          </>
        ),
      })
      return
    }
    if (vRed === 0) {
      setPredictMsg({
        ok: false,
        text: 'سرعة السيارة الحمراء صفر! ارفع سرعتها من المنزلق ثم حاول مجدداً.',
      })
      return
    }
    const actual = predictPosition(sim.xRed, vRed, predictDt)
    const { correct, error } = checkPrediction(g, actual, vRed)
    // The substitution is shown as maths (KaTeX) with English unit symbols.
    const substitution = (
      <Tex
        tex={`x_2 = x_1 + v\\,\\Delta t = ${round(sim.xRed)}\\,\\mathrm{m} + ${round(vRed)}\\,\\mathrm{m/s} \\times ${round(predictDt)}\\,\\mathrm{s} = ${round(actual)}\\,\\mathrm{m}`}
        label="الموضع الجديد = الموضع الحالي + السرعة × الزمن"
      />
    )
    if (correct) {
      fireMission('motion-prediction')
      setPredictMsg({
        ok: true,
        text: (
          <>
            تنبّؤ صحيح! الموضع الحقيقي نحو <Measure value={actual} unit="metre" /> من البداية (خطأك{' '}
            <Measure value={error} unit="metre" /> فقط). شاهد السيارة تصل إليه الآن. {substitution}
          </>
        ),
      })
      advance(predictDt)
      const s2 = simRef.current
      setReadouts({
        t: s2.t,
        dRed: s2.xRed,
        gap: Math.abs(s2.xRed - s2.xBlue),
        vRel: relativeVelocity(vRed, vBlue),
      })
      draw()
      drawGraph()
    } else {
      setPredictMsg({
        ok: false,
        text: (
          <>
            ليس بعد — أنت بعيد بمقدار <Measure value={error} unit="metre" />. تذكّر العلاقة{' '}
            <Tex tex="x_2 = x_1 + v\,\Delta t" /> حيث الموضع الحالي{' '}
            <Measure value={sim.xRed} unit="metre" /> والسرعة{' '}
            <Measure value={vRed} unit="metresPerSecond" digits={0} /> والزمن{' '}
            <Measure value={predictDt} unit="second" digits={0} />. حاول مجدداً!
          </>
        ),
      })
    }
  }

  const relKind = describeRelativeMotion(
    simRef.current.xRed - simRef.current.xBlue,
    vRed,
    vBlue,
  )
  const relSentence =
    vRed === 0 && vBlue === 0
      ? 'السيارتان ساكنتان بالنسبة إلى الأرض والى بعضهما.'
      : relKind === 'at-rest'
        ? 'الحمراء ساكنة بالنسبة إلى الزرقاء — المسافة بينهما ثابتة رغم حركتهما معاً!'
        : relKind === 'approaching'
          ? 'الحمراء تقترب من الزرقاء بالنسبة إلى مراقب فيها.'
          : 'الحمراء تبتعد عن الزرقاء بالنسبة إلى مراقب فيها.'

  const doneMissions = state.labMissions

  return (
    <div className="motion-lab" ref={wrapRef}>
      {/* ——— Simulation stage ——— */}
      <div className="lab-stage" dir="ltr">
        <canvas
          ref={canvasRef}
          className="lab-canvas"
          onClick={onCanvasClick}
          role="img"
          aria-label="محاكاة بصرية: سيارة حمراء وسيارة زرقاء تتحركان على طريق مستقيم ذي حارتين، مع لافتات مسافة كل 20 m ونقاط مواضع كل 1 s."
        />
        <div className="lab-frame-badge" dir="rtl" aria-live="polite">
          <Eye size={16} aria-hidden="true" />
          {frame === 'ground'
            ? 'أنت تراقب من الأرض (جانب الطريق)'
            : 'أنت تراقب من داخل السيارة الزرقاء'}
        </div>
        {!started && (
          <button type="button" className="lab-start-overlay" onClick={toggleRun} dir="rtl">
            <Play size={30} aria-hidden="true" />
            <span>شغّل التجربة</span>
            {reducedMotion && <small>يمكنك أيضاً التقدّم خطوة بخطوة</small>}
          </button>
        )}
      </div>

      {/* ——— Transport + frame ——— */}
      <div className="lab-toolbar">
        <div className="lab-transport" role="group" aria-label="أزرار تشغيل التجربة">
          <ActionButton onClick={toggleRun} aria-pressed={running}>
            {running ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
            {running ? 'إيقاف مؤقت' : 'تشغيل'}
          </ActionButton>
          <ActionButton variant="secondary" onClick={stepOnce}>
            <StepForward size={18} aria-hidden="true" /> خطوة +1{' '}
            <span className="unit">s</span>
          </ActionButton>
          <ActionButton variant="ghost" onClick={reset}>
            <RotateCcw size={18} aria-hidden="true" /> إعادة
          </ActionButton>
        </div>

        <div className="lab-frames" role="group" aria-label="اختيار مرجع المراقبة">
          <span className="lab-frames__label">مرجع المراقبة:</span>
          <button
            type="button"
            className={`frame-btn${frame === 'ground' ? ' is-active' : ''}`}
            aria-pressed={frame === 'ground'}
            onClick={() => changeFrame('ground')}
          >
            الأرض
          </button>
          <button
            type="button"
            className={`frame-btn${frame === 'blue' ? ' is-active' : ''}`}
            aria-pressed={frame === 'blue'}
            onClick={() => changeFrame('blue')}
          >
            السيارة الزرقاء
          </button>
        </div>
      </div>

      {/* ——— Speed controls ——— */}
      <div className="lab-sliders">
        <div className="lab-slider lab-slider--red">
          <label htmlFor="v-red">
            <Gauge size={17} aria-hidden="true" />
            سرعة السيارة الحمراء (الهدف)
            <output htmlFor="v-red" className="lab-slider__out">
              <Measure value={vRed} unit="metresPerSecond" digits={0} />
              <span className="lab-slider__kmh">
                ≈ <Measure value={vRed * 3.6} unit="kilometresPerHour" />
              </span>
            </output>
          </label>
          <input
            id="v-red"
            type="range"
            min={0}
            max={20}
            step={1}
            value={vRed}
            onChange={(e) => setVRed(Number(e.target.value))}
          />
        </div>
        <div className="lab-slider lab-slider--blue">
          <label htmlFor="v-blue">
            <Gauge size={17} aria-hidden="true" />
            سرعة السيارة الزرقاء (المراقب)
            <output htmlFor="v-blue" className="lab-slider__out">
              <Measure value={vBlue} unit="metresPerSecond" digits={0} />
              <span className="lab-slider__kmh">
                ≈ <Measure value={vBlue * 3.6} unit="kilometresPerHour" />
              </span>
            </output>
          </label>
          <input
            id="v-blue"
            type="range"
            min={0}
            max={20}
            step={1}
            value={vBlue}
            onChange={(e) => setVBlue(Number(e.target.value))}
          />
        </div>
      </div>

      {/* ——— Live measurements ——— */}
      <div className="lab-readouts" aria-label="قياسات حيّة">
        <div className="readout">
          <span className="readout__label">
            <Timer size={15} aria-hidden="true" /> الزمن المنقضي
          </span>
          <strong>
            <Measure value={readouts.t} unit="second" />
          </strong>
        </div>
        <div className="readout">
          <span className="readout__label">
            <Flag size={15} aria-hidden="true" /> مسافة الحمراء من البداية
          </span>
          <strong>
            <Measure value={readouts.dRed} unit="metre" />
          </strong>
        </div>
        <div className="readout">
          <span className="readout__label">المسافة بين السيارتين</span>
          <strong>
            <Measure value={readouts.gap} unit="metre" />
          </strong>
        </div>
        <div className="readout readout--accent">
          <span className="readout__label">سرعة الحمراء بالنسبة إلى الزرقاء</span>
          <strong>
            <Measure value={Math.abs(readouts.vRel)} unit="metresPerSecond" />
          </strong>
        </div>
      </div>
      <p className="lab-insight" aria-live="polite">
        {relSentence}
      </p>

      {/* ——— Graph ——— */}
      <figure className="lab-graph-wrap">
        <figcaption className="lab-graph-title">
          مخطط (المسافة – الزمن)
          <span className="lab-graph-legend">
            <span className="dot dot--red" aria-hidden="true" /> الحمراء
            <span className="dot dot--blue" aria-hidden="true" /> الزرقاء
          </span>
          <span className="lab-graph-hint">كلّما كان الخط أكثر انحداراً كانت السرعة أكبر</span>
        </figcaption>
        <div dir="ltr">
          <canvas
            ref={graphRef}
            className="lab-graph"
            role="img"
            aria-label="مخطط بياني يرسم مسافة كل سيارة من نقطة البداية بدلالة الزمن أثناء التجربة."
          />
        </div>
      </figure>

      {/* ——— Prediction challenge ——— */}
      <section className="lab-predict" aria-labelledby="predict-title">
        <div className="lab-predict__head">
          <h3 id="predict-title">
            <Crosshair size={20} aria-hidden="true" /> تحدّي التنبّؤ
          </h3>
          {!predictOn ? (
            <ActionButton variant="gold" onClick={startPrediction}>
              ابدأ التحدّي
            </ActionButton>
          ) : (
            <ActionButton variant="secondary" onClick={startPrediction}>
              تحدٍّ جديد
            </ActionButton>
          )}
        </div>

        {predictOn ? (
          <>
            <p>
              السيارة الحمراء الآن عند{' '}
              <strong>
                <Measure value={readouts.dRed} unit="metre" />
              </strong>{' '}
              وتسير بسرعة{' '}
              <strong>
                <Measure value={vRed} unit="metresPerSecond" digits={0} />
              </strong>
              . أين ستكون بعد{' '}
              <strong>
                <Measure value={predictDt} unit="second" digits={0} />
              </strong>
              ؟ استعمل العلاقة{' '}
              <Tex tex="x_2 = x_1 + v\,\Delta t" label="الموضع الجديد = الموضع الحالي + السرعة × الزمن" />،
              ثم اضغط على المسار في الأعلى لتثبيت علم توقّعك، أو أدخل الموضع من البداية بوحدة{' '}
              <span className="unit">m</span>:
            </p>
            <div className="lab-predict__row">
              <label className="lab-predict__input">
                توقّعي: الموضع من البداية بوحدة <span className="unit">m</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={guessInput}
                  onChange={(e) => {
                    setGuessInput(e.target.value)
                    const n = Number(e.target.value)
                    setGuess(e.target.value.trim() === '' || Number.isNaN(n) ? null : n)
                  }}
                  placeholder="مثال: 40"
                />
              </label>
              <ActionButton onClick={checkGuess}>تحقّق من تنبّؤي</ActionButton>
            </div>
            {predictMsg && (
              <p
                className={`lab-predict__msg ${predictMsg.ok ? 'is-ok' : 'is-no'}`}
                role="status"
                aria-live="polite"
              >
                {predictMsg.ok && <CheckCircle2 size={19} aria-hidden="true" />}
                {predictMsg.text}
              </p>
            )}
          </>
        ) : (
          <p>
            اختبر فهمك لعلاقة{' '}
            <Tex tex="d = v\,t" label="المسافة = السرعة × الزمن" />: سنوقف الزمن، وتتنبّأ أنت بموضع
            السيارة الحمراء بعد مدّة زمنية محدّدة. التنبّؤ الصحيح يمنحك نقاط خبرة!
          </p>
        )}
      </section>

      {/* ——— Missions ——— */}
      <section className="lab-missions" aria-labelledby="lab-missions-title">
        <h3 id="lab-missions-title">
          <Trophy size={20} aria-hidden="true" /> مهام المختبر
        </h3>
        <ul>
          {missions.map((m) => {
            const done = doneMissions.includes(m.id)
            return (
              <li key={m.id} className={done ? 'is-done' : ''}>
                <span className="lab-missions__check" aria-hidden="true">
                  {done ? <CheckCircle2 size={20} /> : <span className="lab-missions__circle" />}
                </span>
                <span className="lab-missions__text">
                  <strong>{m.title}</strong>
                  <span>
                    <RichText text={m.description} />
                  </span>
                </span>
                <span className="lab-missions__xp">
                  +<span className="num">{m.xp}</span> XP
                </span>
                <span className="sr-only">{done ? 'منجزة' : 'غير منجزة بعد'}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
