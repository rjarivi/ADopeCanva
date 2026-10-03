import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
    Download, RotateCcw, Image as ImageIcon, Box, Apple, Orbit, Play, Pause,
    Film, SlidersHorizontal, Sun, MonitorSmartphone, Loader2, Maximize2, Minimize2, Sparkles,
} from 'lucide-react'
import { FileUploader } from '../../components/FileUploader'
import { Button } from '../../components/ui/Button'
import { useIsMobile } from '../../hooks/useIsMobile'
import { FileData } from '../../types'
import { useFocusedMode } from '../../contexts/FocusedMode'

type BgDef = {
    id: string
    label: string
    css: string
    paint?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
}

const CANVAS_RATIOS = [
    { id: '16/9', label: '16:9' },
    { id: '4/3', label: '4:3' },
    { id: '1/1', label: '1:1' },
    { id: '4/5', label: '4:5' },
    { id: '9/16', label: '9:16' },
]

function cssAngleToLine(deg: number, w: number, h: number) {
    const rad = (deg - 90) * (Math.PI / 180)
    const dx = Math.cos(rad)
    const dy = Math.sin(rad)
    const len = Math.abs(w * dx) + Math.abs(h * dy)
    const cx = w / 2
    const cy = h / 2
    return { x0: cx - (dx * len) / 2, y0: cy - (dy * len) / 2, x1: cx + (dx * len) / 2, y1: cy + (dy * len) / 2 }
}

function paintStops(ctx: CanvasRenderingContext2D, grad: CanvasGradient, stops: string[]) {
    const n = stops.length
    stops.forEach((c, i) => grad.addColorStop(n === 1 ? 0 : i / (n - 1), c))
}

const BACKGROUNDS: BgDef[] = [
    { id: 'light', label: 'Light', css: '#e5e5e5' },
    { id: 'white', label: 'White', css: '#ffffff' },
    { id: 'dark', label: 'Dark', css: '#1c1c1e' },
    { id: 'transparent', label: 'Transparent', css: 'transparent' },
    {
        id: 'indigo', label: 'Indigo', css: 'linear-gradient(135deg,#3730a3,#818cf8)',
        paint: (ctx, w, h) => {
            const l = cssAngleToLine(135, w, h)
            const g = ctx.createLinearGradient(l.x0, l.y0, l.x1, l.y1)
            paintStops(ctx, g, ['#3730a3', '#818cf8'])
            ctx.fillStyle = g
            ctx.fillRect(0, 0, w, h)
        },
    },
    {
        id: 'sunset', label: 'Sunset', css: 'linear-gradient(135deg,#ea580c,#db2777)',
        paint: (ctx, w, h) => {
            const l = cssAngleToLine(135, w, h)
            const g = ctx.createLinearGradient(l.x0, l.y0, l.x1, l.y1)
            paintStops(ctx, g, ['#ea580c', '#db2777'])
            ctx.fillStyle = g
            ctx.fillRect(0, 0, w, h)
        },
    },
    {
        id: 'ocean', label: 'Ocean', css: 'linear-gradient(135deg,#0369a1,#4f46e5)',
        paint: (ctx, w, h) => {
            const l = cssAngleToLine(135, w, h)
            const g = ctx.createLinearGradient(l.x0, l.y0, l.x1, l.y1)
            paintStops(ctx, g, ['#0369a1', '#4f46e5'])
            ctx.fillStyle = g
            ctx.fillRect(0, 0, w, h)
        },
    },
    {
        id: 'studio', label: 'Studio', css: 'radial-gradient(ellipse at 50% 30%,#3f3f56,#101014 75%)',
        paint: (ctx, w, h) => {
            const g = ctx.createRadialGradient(w / 2, h * 0.3, 10, w / 2, h * 0.3, Math.max(w, h) * 0.9)
            paintStops(ctx, g, ['#3f3f56', '#101014'])
            ctx.fillStyle = g
            ctx.fillRect(0, 0, w, h)
        },
    },
]

const CAMERA_PRESETS = [
    { id: 'hero', label: 'Hero', el: 42, az: 35 },
    { id: 'screen', label: 'Screen', el: 80, az: 0 },
    { id: 'side', label: 'Side', el: 14, az: 96 },
    { id: 'low', label: 'Back', el: -14, az: -25 },
] as const

interface Settings {
    fold: number
    loop: boolean
    canvasRatio: string
    bgId: string
    screenFit: 'cover' | 'contain'
    screenZoom: number
    screenX: number
    screenY: number
    brightness: number
    envIntensity: number
    lightAngle: number
    turntable: boolean
    exportScale: number
}

const DEFAULTS: Settings = {
    fold: 0,
    loop: false,
    canvasRatio: '4/3',
    bgId: 'studio',
    screenFit: 'cover',
    screenZoom: 1,
    screenX: 0,
    screenY: 0,
    brightness: 1,
    envIntensity: 1,
    lightAngle: 35,
    turntable: false,
    exportScale: 2,
}

function Slider({ label, value, min, max, step = 1, unit = '', tooltip, defaultValue, onChange }: {
    label: string; value: number; min: number; max: number; step?: number; unit?: string
    tooltip?: string; defaultValue?: number
    onChange: (v: number) => void
}) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState('')
    const pct = ((value - min) / (max - min)) * 100

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-1">
                <span
                    className="text-[10px] font-bold tracking-[0.12em] text-zinc-500 uppercase font-jakarta cursor-default select-none"
                    title={tooltip}
                >
                    {label}
                </span>
                <div className="flex items-center gap-1">
                    {editing ? (
                        <input
                            autoFocus
                            type="text"
                            inputMode="decimal"
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onBlur={() => {
                                const n = parseFloat(draft)
                                if (!isNaN(n)) onChange(Math.max(min, Math.min(max, parseFloat(n.toFixed(10)))))
                                setEditing(false)
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                if (e.key === 'Escape') setEditing(false)
                            }}
                            className="w-14 text-right bg-zinc-900 border border-indigo-500/60 text-white text-[11px] font-mono tabular-nums rounded-md px-2 py-0.5 outline-none ring-1 ring-indigo-500/20 selection:bg-indigo-500/30"
                            style={{ caretColor: '#818cf8' }}
                        />
                    ) : (
                        <button
                            onClick={() => { setDraft(String(value)); setEditing(true) }}
                            className="text-[11px] text-zinc-400 font-mono tabular-nums hover:text-white hover:bg-zinc-800 transition-colors px-1.5 py-0.5 rounded"
                            title="Click to enter exact value"
                        >
                            {value}{unit}
                        </button>
                    )}
                    {defaultValue !== undefined && value !== defaultValue && (
                        <button
                            onClick={() => onChange(defaultValue)}
                            className="text-zinc-600 hover:text-zinc-300 transition-colors p-0.5"
                            title="Reset to default"
                        >
                            <RotateCcw className="w-2.5 h-2.5" />
                        </button>
                    )}
                </div>
            </div>
            <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full cursor-pointer"
                style={{
                    WebkitAppearance: 'none', appearance: 'none',
                    height: 3, borderRadius: 2,
                    background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${pct}%, #3f3f46 ${pct}%, #3f3f46 100%)`,
                    outline: 'none',
                }}
            />
        </div>
    )
}

const SCREEN_W = 1024
const SCREEN_H = 2048
const CLIP_MAX_TIME = 2
const HOLD = 0.35

function smoothstep(edge0: number, edge1: number, x: number) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)
}
interface PanelCanvas {
    mat: import('three').MeshStandardMaterial
    origEmissive: import('three').Texture | null
    canvas: HTMLCanvasElement
    ctx: CanvasRenderingContext2D
    tex: import('three').CanvasTexture
    aspect: number
}

interface ScreenInfo {
    panels: PanelCanvas[]
}

interface StageRefs {
    THREE: typeof import('three')
    renderer: import('three').WebGLRenderer
    scene: import('three').Scene
    camera: import('three').PerspectiveCamera
    controls: import('three/examples/jsm/controls/OrbitControls.js').OrbitControls
    keyLight: import('three').DirectionalLight
    center: import('three').Vector3
    radius: number
    model: import('three').Object3D | null
    mixer: import('three').AnimationMixer | null
    sliderAction: import('three').AnimationAction | null
    introAction: import('three').AnimationAction | null
    introDuration: number
    screen: ScreenInfo | null
    introStartDist: number | null
}

type ViewMode = 'intro' | 'loop' | 'hold' | 'settled'

type PVGLTF = { scene: import('three').Object3D; animations: import('three').AnimationClip[] }

let gltfLoaderPromise: Promise<import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader> | null = null
let pvCache: PVGLTF | null = null

export const Mockup3D: React.FC = () => {
    const isMobile = useIsMobile()
    const containerRef = useRef<HTMLDivElement>(null)
    const stageRef = useRef<StageRefs | null>(null)
    const rafRef = useRef<number>(0)
    const mediaElRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null)
    const recordingRef = useRef(false)
    const recStartRef = useRef(0)
    const videoLastTimeRef = useRef(0)
    const modeRef = useRef<ViewMode>('intro')
    const foldAppliedRef = useRef(DEFAULTS.fold)
    const lastDrawnFold = useRef(-1)
    const settingsRef = useRef<Settings>({ ...DEFAULTS })
    const cycleRef = useRef(0)
    const frameDistRef = useRef<number | null>(null)

    const [fileData, setFileData] = useState<FileData | null>(null)
    const [mediaUrl, setMediaUrl] = useState<string | null>(null)
    const [isVideo, setIsVideo] = useState(false)
    const [settings, setSettings] = useState<Settings>(DEFAULTS)
    const [customBgColor, setCustomBgColor] = useState('#6366f1')
    const [loadProgress, setLoadProgress] = useState(0)
    const [glError, setGlError] = useState('')
    const [bootKey, setBootKey] = useState(0)
    const [modelReady, setModelReady] = useState(false)
    const [modelVersion, setModelVersion] = useState(0)
    const [exporting, setExporting] = useState(false)
    const [recording, setRecording] = useState(false)
    const [activePreset, setActivePreset] = useState<string>('hero')
    const { focused, setFocused } = useFocusedMode()

    settingsRef.current = settings

    const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }))
    }, [])

    const handleFile = useCallback((fd: FileData) => {
        const video = fd.type.startsWith('video/')
        setFileData(fd)
        setMediaUrl(fd.previewUrl ?? URL.createObjectURL(fd.file))
        setIsVideo(video)
        setGlError('')
    }, [])

    const handleReset = () => {
        setFileData(null)
        if (mediaUrl) URL.revokeObjectURL(mediaUrl)
        setMediaUrl(null)
        setIsVideo(false)
        mediaElRef.current = null
        setSettings(DEFAULTS)
        setGlError('')
    }

    // ── three.js scene bootstrap ──────────────────────────────────────────
    useEffect(() => {
        if (!mediaUrl) return
        let disposed = false
        let pmremInstance: import('three').PMREMGenerator | null = null

        const boot = async () => {
            let bootRenderer: import('three').WebGLRenderer | null = null
            try {
                const THREE = await import('three')
                const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
                const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js')
                if (disposed) return

                const container = containerRef.current
                if (!container) return

                const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
                bootRenderer = renderer
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
                renderer.toneMapping = THREE.NeutralToneMapping
                renderer.toneMappingExposure = 1.1
                renderer.outputColorSpace = THREE.SRGBColorSpace
                container.appendChild(renderer.domElement)
                renderer.domElement.style.display = 'block'
                renderer.domElement.style.width = '100%'
                renderer.domElement.style.height = '100%'

                const scene = new THREE.Scene()
                const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100)
                camera.position.set(0, 4, 8)

                const pmrem = new THREE.PMREMGenerator(renderer)
                pmremInstance = pmrem
                scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
                scene.environmentIntensity = 1

                const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
                keyLight.position.set(4, 10, 5)
                scene.add(keyLight)
                scene.add(new THREE.AmbientLight(0xffffff, 0.25))

                const controls = new OrbitControls(camera, renderer.domElement)
                controls.enableDamping = true
                controls.dampingFactor = 0.08
                controls.enablePan = false
                controls.autoRotateSpeed = 1.6
                controls.target.set(0, 2, 0)

                stageRef.current = {
                    THREE, renderer, scene, camera, controls, keyLight,
                    center: new THREE.Vector3(0, 2, 0), radius: 3,
                    model: null, mixer: null, sliderAction: null, introAction: null, introDuration: 0, screen: null, introStartDist: null,
                }
                modeRef.current = 'hold'
                setModelReady(true)
                applyLighting()
            } catch (err) {
                console.error('3D init failed:', err)
                if (!stageRef.current && bootRenderer) {
                    bootRenderer.dispose()
                    bootRenderer.domElement.remove()
                }
                pmremInstance?.dispose()
                setGlError(err instanceof Error ? err.message : 'Could not start 3D rendering — try a different browser.')
            }
        }
        boot()

        function applyLighting() {
            const s = stageRef.current
            if (!s) return
            const a = ((settingsRef.current.lightAngle) * Math.PI) / 180
            const d = s.radius * 4
            s.keyLight.position.set(s.center.x + Math.sin(a) * d, s.center.y + d * 0.85, s.center.z + Math.cos(a) * d)
            s.scene.environmentIntensity = settingsRef.current.envIntensity
        }

        return () => {
            disposed = true
            const s = stageRef.current
            if (s) {
                cancelAnimationFrame(rafRef.current)
                s.mixer?.stopAllAction()
                if (s.model) s.scene.remove(s.model)
                s.controls.dispose()
                if (s.screen) for (const p of s.screen.panels) p.tex.dispose()
                s.renderer.dispose()
                s.renderer.domElement.remove()
                stageRef.current = null
                setModelReady(false)
            }
            pmremInstance?.dispose()
        }
    }, [mediaUrl, bootKey])

    // ── model load ────────────────────────────────────────────────────────
    useEffect(() => {
        const s = stageRef.current
        if (!s || !modelReady) return
        let cancelled = false

        const load = async () => {
            try {
                const url = `${import.meta.env.BASE_URL}assets/models/iphone-duo-animated.glb`
                if (!gltfLoaderPromise) {
                    gltfLoaderPromise = import('three/examples/jsm/loaders/GLTFLoader.js').then(m => new m.GLTFLoader())
                }
                const loader = await gltfLoaderPromise
                if (!pvCache) {
                    const gltf = await loader.loadAsync(url, ev => {
                        if (ev.total > 0) setLoadProgress(Math.round((ev.loaded / ev.total) * 100))
                    })
                    if (cancelled) return
                    pvCache = { scene: gltf.scene, animations: gltf.animations }
                }
                if (cancelled) return
                setLoadProgress(0)

                const THREE = s.THREE
                s.model = pvCache.scene
                s.scene.add(s.model)

                const mixer = new THREE.AnimationMixer(s.model)
                const clip = THREE.AnimationClip.findByName(pvCache.animations, 'Slider') ?? pvCache.animations[0]
                const action = mixer.clipAction(clip)
                action.play()
                action.paused = true
                s.mixer = mixer
                s.sliderAction = action

                const introClip = THREE.AnimationClip.findByName(pvCache.animations, 'Intro')
                const introDuration = introClip ? introClip.duration : 0
                const introAction = introClip ? mixer.clipAction(introClip) : null
                if (introAction) introAction.clampWhenFinished = true
                s.introAction = introAction
                s.introDuration = introDuration

                s.sliderAction.paused = true
                s.sliderAction.time = 0
                s.mixer.update(0)
                const closedBox = new THREE.Box3().setFromObject(s.model)
                const closedH = Math.max(closedBox.getSize(new THREE.Vector3()).y, 1e-6)
                const halfFov = (s.camera.fov * Math.PI) / 180 / 2
                frameDistRef.current = closedH / (2 * Math.tan(halfFov) * 0.72)
                foldAppliedRef.current = 0
                modeRef.current = 'hold'

                const box = new THREE.Box3().setFromObject(s.model)
                s.center = box.getCenter(new THREE.Vector3())
                s.radius = box.getSize(new THREE.Vector3()).length() / 2
                s.controls.target.copy(s.center)
                s.controls.minDistance = s.radius * 0.55
                s.controls.maxDistance = s.radius * 8
                s.camera.near = s.radius / 100
                s.camera.far = s.radius * 60
                s.camera.updateProjectionMatrix()

                const screenMats: { std: import('three').MeshStandardMaterial; mesh: import('three').Mesh }[] = []
                s.model.traverse(obj => {
                    const mesh = obj as import('three').Mesh
                    if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return
                    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
                    for (const m of mats) {
                        const std = m as import('three').MeshStandardMaterial
                        if (std && typeof std.name === 'string' && std.name.startsWith('SCREEN') && !screenMats.some(e => e.std === std)) {
                            screenMats.push({ std, mesh })
                        }
                    }
                })

                const panels: PanelCanvas[] = screenMats.map(({ std, mesh }, pi) => {
                    const geo = (mesh.geometry as import('three').BufferGeometry)
                    if (!geo.boundingBox) geo.computeBoundingBox()
                    const bs = (geo.boundingBox as import('three').Box3).getSize(new THREE.Vector3())
                    const aspect = Math.max(0.3, Math.min(3, Math.max(bs.x, 1e-6) / Math.max(bs.z, 1e-6)))
                    const canvas = document.createElement('canvas')
                    canvas.width = SCREEN_W
                    canvas.height = Math.max(256, Math.min(2048, Math.round(SCREEN_W / aspect)))
                    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
                    const tex = new THREE.CanvasTexture(canvas)
                    tex.colorSpace = THREE.SRGBColorSpace
                    tex.flipY = false
                    tex.wrapS = THREE.ClampToEdgeWrapping
                    tex.wrapT = THREE.ClampToEdgeWrapping
                    tex.anisotropy = s.renderer.capabilities.getMaxAnisotropy()
                    void pi
                    return { mat: std, origEmissive: std.emissiveMap ?? null, canvas, ctx, tex, aspect }
                })
                s.screen = { panels }
                setModelVersion(v => v + 1)
            } catch (err) {
                console.error('Model load failed:', err)
                setGlError('Could not load the animated 3D model — check your connection and retry.')
            }
        }
        load()
        return () => { cancelled = true }
    }, [modelReady])

    const applyFold = useCallback((fold: number) => {
        const s = stageRef.current
        if (!s || !s.sliderAction || !s.mixer) return
        s.sliderAction.paused = true
        s.sliderAction.time = Math.max(0, Math.min(1, fold)) * CLIP_MAX_TIME
        s.mixer.update(0)
        foldAppliedRef.current = fold
    }, [])

    // ── screen texture drawing ────────────────────────────────────────────
    const redrawScreen = useCallback(() => {
        const s = stageRef.current
        const media = mediaElRef.current
        if (!s || !s.screen) return
        const v = media instanceof HTMLVideoElement ? media : null
        const img = media instanceof HTMLImageElement ? media : null
        const iw = v?.videoWidth ?? img?.naturalWidth ?? 0
        const ih = v?.videoHeight ?? img?.naturalHeight ?? 0
        const st = settingsRef.current
        const bend = 4 * Math.min(1, Math.max(0, foldAppliedRef.current)) * (1 - Math.min(1, Math.max(0, foldAppliedRef.current)))

        for (const panel of s.screen.panels) {
            const W = panel.canvas.width
            const H = panel.canvas.height
            panel.ctx.setTransform(1, 0, 0, 1, 0, 0)
            panel.ctx.fillStyle = '#000000'
            panel.ctx.fillRect(0, 0, W, H)
            if (media && iw && ih) {
                const base = st.screenFit === 'cover'
                    ? Math.max(W / iw, H / ih)
                    : Math.min(W / iw, H / ih)
                const scale = base * st.screenZoom
                const w = iw * scale
                const h = ih * scale
                const x = (W - w) / 2 + (st.screenX / 100) * (W / 2)
                const y = (H - h) / 2 + (st.screenY / 100) * (H / 2)
                if (bend > 0.02) {
                    panel.ctx.filter = `blur(${(bend * 24).toFixed(1)}px)`
                }
                panel.ctx.drawImage(media, x, y, w, h)
                panel.ctx.filter = 'none'
            }
            panel.tex.needsUpdate = true
        }
    }, [])

    // ── attach media to screens ───────────────────────────────────────────
    useEffect(() => {
        const s = stageRef.current
        if (!s || !modelReady || modelVersion === 0) return
        let active = true
        const screen = s.screen
        if (!screen) return

        if (!mediaUrl) {
            screen.panels.forEach(p => {
                p.mat.emissiveMap = p.origEmissive
                p.mat.emissive.setRGB(1, 1, 1)
                p.mat.emissiveIntensity = 1
                p.mat.needsUpdate = true
            })
            return
        }

        const attach = () => {
            if (!active) return
            screen.panels.forEach(p => {
                p.mat.emissiveMap = p.tex
                p.mat.emissive.setRGB(1, 1, 1)
                p.mat.emissiveIntensity = settingsRef.current.brightness
                p.mat.needsUpdate = true
            })
            redrawScreen()
        }

        if (isVideo) {
            const video = document.createElement('video')
            video.src = mediaUrl
            video.loop = true
            video.muted = true
            video.playsInline = true
            video.crossOrigin = 'anonymous'
            video.addEventListener('loadeddata', attach)
            video.play().catch(() => { })
            videoLastTimeRef.current = 0
            mediaElRef.current = video
        } else {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = attach
            img.src = mediaUrl
            mediaElRef.current = img
        }
        return () => {
            active = false
            const cur = mediaElRef.current
            if (cur instanceof HTMLVideoElement) {
                cur.pause()
                mediaElRef.current = null
            }
        }
    }, [mediaUrl, isVideo, modelReady, modelVersion])

    // redraw screen on fit/zoom changes
    useEffect(() => {
        if (mediaElRef.current) redrawScreen()
    }, [settings.screenFit, settings.screenZoom, settings.screenX, settings.screenY, redrawScreen, modelVersion])

    // keep params in sync
    const currentParams = useRef(settings)
    currentParams.current = settings

    // ── render loop ───────────────────────────────────────────────────────
    useEffect(() => {
        const s = stageRef.current
        const container = containerRef.current
        if (!s || !container) return

        const resize = () => {
            const w = container.clientWidth || 1
            const h = container.clientHeight || 1
            s.renderer.setSize(w, h, false)
            s.camera.aspect = w / h
            s.camera.updateProjectionMatrix()
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(container)

        let last = performance.now()

        const loop = () => {
            rafRef.current = requestAnimationFrame(loop)
            s.controls.update()
            const now = performance.now()
            const dt = Math.min((now - last) / 1000, 0.05)
            last = now

            const st = settingsRef.current

            if (recordingRef.current) {
                const t = (now - recStartRef.current) / 1000
                const REC_CYCLE = CLIP_MAX_TIME + HOLD + CLIP_MAX_TIME + HOLD
                const cyc = Math.min(t, REC_CYCLE) % REC_CYCLE
                let time: number
                if (cyc < CLIP_MAX_TIME) time = cyc
                else if (cyc < CLIP_MAX_TIME + HOLD) time = CLIP_MAX_TIME
                else if (cyc < CLIP_MAX_TIME + HOLD + CLIP_MAX_TIME) time = REC_CYCLE - cyc
                else time = 0
                applyFold(time / CLIP_MAX_TIME)
            } else if (modeRef.current === 'intro' && s.introAction && s.mixer && s.introDuration > 0 && s.sliderAction) {
                s.sliderAction.enabled = false
                s.mixer.update(dt)
                const p = Math.max(0, Math.min(1, s.introAction.time / s.introDuration))
                foldAppliedRef.current = smoothstep(0.33, 0.73, p)
                if (s.introStartDist !== null) {
                    const pushIn = 1 - 0.06 * smoothstep(0, 0.3, p)
                    const settle = 1 + 0.075 * smoothstep(0.6, 0.92, p)
                    const dist = s.introStartDist * pushIn * settle
                    const cam = s.camera
                    const dir = new s.THREE.Vector3().subVectors(cam.position, s.center).normalize()
                    cam.position.copy(s.center).addScaledVector(dir, dist)
                    cam.lookAt(s.center)
                }
                if (s.introAction.time >= s.introDuration - 1e-4) {
                    s.introAction.stop()
                    s.sliderAction.enabled = true
                    if (st.loop) { modeRef.current = 'loop'; cycleRef.current = CLIP_MAX_TIME }
                    else modeRef.current = 'settled'
                }
            } else if (st.loop && s.sliderAction) {
                // natural clip-driven cycle: closed → open (Apple pacing) → hold → reverse → hold
                const CYCLE = CLIP_MAX_TIME + HOLD + CLIP_MAX_TIME + HOLD
                cycleRef.current = (cycleRef.current + dt) % CYCLE
                let time: number
                if (cycleRef.current < CLIP_MAX_TIME) time = cycleRef.current
                else if (cycleRef.current < CLIP_MAX_TIME + HOLD) time = CLIP_MAX_TIME
                else if (cycleRef.current < CLIP_MAX_TIME + HOLD + CLIP_MAX_TIME) time = CYCLE - cycleRef.current
                else time = 0
                applyFold(time / CLIP_MAX_TIME)
            } else if (modeRef.current !== 'settled') {
                applyFold(st.fold)
            }

            const media = mediaElRef.current
            if (media instanceof HTMLVideoElement && media.readyState >= 2 && !media.paused && media.currentTime !== videoLastTimeRef.current) {
                videoLastTimeRef.current = media.currentTime
                redrawScreen()
            }

            // progressive bend blur: redraw while fold position changes
            if (Math.abs(foldAppliedRef.current - lastDrawnFold.current) > 0.004) {
                lastDrawnFold.current = foldAppliedRef.current
                redrawScreen()
            }

            s.renderer.render(s.scene, s.camera)
        }
        loop()
        return () => {
            cancelAnimationFrame(rafRef.current)
            ro.disconnect()
        }
    }, [modelReady, applyFold, redrawScreen, modelVersion])

    // ── intro replay / scrub helpers ──────────────────────────────────────
    const playIntro = useCallback(() => {
        const s = stageRef.current
        if (!s || !s.introAction || !s.mixer || !s.sliderAction || s.introDuration <= 0) return
        s.sliderAction.enabled = false
        s.introAction.reset().play()
        s.introStartDist = s.camera.position.distanceTo(s.center)
        modeRef.current = 'intro'
    }, [])

    const stopForScrub = useCallback((fold?: number) => {
        const s = stageRef.current
        if (!s) return
        if (modeRef.current === 'intro' && s.introAction) {
            s.introAction.stop()
            if (s.sliderAction) s.sliderAction.enabled = true
        }
        modeRef.current = 'hold'
        applyFold(fold ?? settingsRef.current.fold)
    }, [applyFold])

    // ── camera presets ────────────────────────────────────────────────────
    useEffect(() => {
        const s = stageRef.current
        if (!s || !modelReady || modelVersion === 0) return
        const preset = CAMERA_PRESETS.find(p => p.id === activePreset) ?? CAMERA_PRESETS[0]
        const { camera, controls, center, radius } = s
        const R = frameDistRef.current ?? radius * 2.2
        const phi = ((90 - preset.el) * Math.PI) / 180
        const theta = (preset.az * Math.PI) / 180
        camera.position.set(
            center.x + R * Math.sin(phi) * Math.sin(theta),
            center.y + R * Math.cos(phi),
            center.z + R * Math.sin(phi) * Math.cos(theta),
        )
        controls.target.copy(center)
        camera.lookAt(center)
        controls.update()
    }, [activePreset, modelReady, modelVersion])

    useEffect(() => {
        if (stageRef.current) stageRef.current.controls.autoRotate = settings.turntable
    }, [settings.turntable])

    // ── lighting ──────────────────────────────────────────────────────────
    useEffect(() => {
        const s = stageRef.current
        if (!s || !modelReady) return
        const { keyLight, center, radius, scene } = s
        const a = (settings.lightAngle * Math.PI) / 180
        const d = radius * 4
        keyLight.position.set(center.x + Math.sin(a) * d, center.y + d * 0.85, center.z + Math.cos(a) * d)
        scene.environmentIntensity = settings.envIntensity
    }, [settings.lightAngle, settings.envIntensity, modelReady])

    // ── export image ──────────────────────────────────────────────────────
    const handleExport = useCallback(async () => {
        const s = stageRef.current
        const container = containerRef.current
        if (!s || !container) return
        setExporting(true)
        try {
            const { THREE } = s
            const w = container.clientWidth
            const h = container.clientHeight
            const scale = settings.exportScale

            const exportRenderer = new THREE.WebGLRenderer({
                antialias: true, alpha: true, preserveDrawingBuffer: true,
            })
            exportRenderer.setSize(w * scale, h * scale, false)
            exportRenderer.setPixelRatio(1)
            exportRenderer.toneMapping = THREE.NeutralToneMapping
            exportRenderer.toneMappingExposure = 1.1
            exportRenderer.outputColorSpace = THREE.SRGBColorSpace

            const exportCamera = s.camera.clone()
            exportCamera.aspect = w / h
            exportCamera.updateProjectionMatrix()

            exportRenderer.render(s.scene, exportCamera)

            const out = document.createElement('canvas')
            out.width = w * scale
            out.height = h * scale
            const ctx = out.getContext('2d')
            if (ctx) {
                const bgDef = settings.bgId === 'custom'
                    ? { id: 'custom', label: 'Custom', css: customBgColor }
                    : (BACKGROUNDS.find(b => b.id === settings.bgId) ?? BACKGROUNDS[0])
                if (bgDef.css !== 'transparent') {
                    if (bgDef.paint) bgDef.paint(ctx, out.width, out.height)
                    else { ctx.fillStyle = bgDef.css; ctx.fillRect(0, 0, out.width, out.height) }
                }
                ctx.drawImage(exportRenderer.domElement, 0, 0, out.width, out.height)
            }

            const a = document.createElement('a')
            a.href = out.toDataURL('image/png')
            a.download = `3d-mockup-${Date.now()}.png`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)

            exportRenderer.dispose()
            setExporting(false)
        } catch (err) {
            console.error('Export failed:', err)
            setExporting(false)
        }
    }, [settings.exportScale, settings.bgId, customBgColor])

    // ── export video ──────────────────────────────────────────────────────
    const handleExportVideo = useCallback(async () => {
        const s = stageRef.current
        const container = containerRef.current
        if (!s || !container) return
        if (typeof MediaRecorder === 'undefined') {
            setGlError('Video export is not supported in this browser — try Chrome or Edge.')
            return
        }
        setRecording(true)
        recordingRef.current = true

        try {
            const scale = 2
            const w = container.clientWidth * scale
            const h = container.clientHeight * scale
            const canvas = document.createElement('canvas')
            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext('2d')!
            const bgDef = settings.bgId === 'custom'
                ? { id: 'custom', label: 'Custom', css: customBgColor }
                : (BACKGROUNDS.find(b => b.id === settings.bgId) ?? BACKGROUNDS[0])
            const paintBg = () => {
                if (bgDef.css === 'transparent') {
                    ctx.fillStyle = '#101014'
                    ctx.fillRect(0, 0, w, h)
                } else if (bgDef.paint) bgDef.paint(ctx, w, h)
                else { ctx.fillStyle = bgDef.css; ctx.fillRect(0, 0, w, h) }
            }

            const mimeCandidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
            const mime = mimeCandidates.find(t => MediaRecorder.isTypeSupported(t))
            if (!mime) throw new Error('No supported video codec found')
            const ext = mime.includes('mp4') ? 'mp4' : 'webm'

            const stream = canvas.captureStream(30)
            const chunks: Blob[] = []
            const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 16_000_000 })
            rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
            rec.onstop = () => {
                const blob = new Blob(chunks, { type: mime })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = `3d-fold-mockup-${Date.now()}.${ext}`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                setTimeout(() => URL.revokeObjectURL(a.href), 3000)
                setRecording(false)
                recordingRef.current = false
            }

            recStartRef.current = performance.now()
            rec.start()

            const step = () => {
                const t = (performance.now() - recStartRef.current) / 1000
                if (t >= 4.7) {
                    rec.stop()
                    return
                }
                s.renderer.render(s.scene, s.camera)
                paintBg()
                ctx.drawImage(s.renderer.domElement, 0, 0, w, h)
                requestAnimationFrame(step)
            }
            requestAnimationFrame(step)
        } catch (err) {
            console.error('Video export failed:', err)
            setGlError(err instanceof Error ? err.message : 'Video export failed.')
            setRecording(false)
            recordingRef.current = false
        }
    }, [settings.bgId, customBgColor])

    // ─── Upload view ──────────────────────────────────────────────────────
    if (!fileData || !mediaUrl) {
        return (
            <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center">
                <div className="flex-none space-y-3 mb-10">
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight flex items-center justify-center gap-4 font-unbounded">
                        <div className="text-indigo-400"><Box size={42} /></div>
                        <span className="text-white">3D Mockup Studio</span>
                    </h1>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto font-medium">
                        Drop a screenshot or video onto Apple's iPhone Duo foldable — animated hinge, any angle, export PNG or video.
                    </p>
                </div>
                <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col mb-8">
                    <div className="flex-1 bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl" style={{ minHeight: 220 }}>
                        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.05] pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <FileUploader onFileSelect={handleFile} accept="image/*,video/*" label="Add Screenshot or Video" description="PNG, JPG, WebP, MP4 — plays live on both foldable displays" icon={ImageIcon}
                            className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-transparent rounded-2xl transition-all" />
                    </div>
                </div>
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    {[
                        { icon: Apple, title: 'Animated Fold', desc: 'Real Apple hinge animation' },
                        { icon: MonitorSmartphone, title: 'Image or Video', desc: 'Live screen content' },
                        { icon: Sun, title: 'Studio Light', desc: 'HDRI reflections & key light' },
                        { icon: Film, title: 'Video Export', desc: 'Record the fold, any angle' },
                    ].map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="flex flex-col items-center text-center space-y-2 p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors group">
                            <div className="p-3 bg-zinc-900 rounded-full text-indigo-400 group-hover:scale-110 transition-transform shadow-inner">
                                <Icon size={20} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider font-unbounded">{title}</h3>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1 tracking-tight">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // ─── Active view ──────────────────────────────────────────────────────
    const isTransparent = settings.bgId === 'transparent'
    const bg = settings.bgId === 'custom'
        ? { id: 'custom', label: 'Custom', css: customBgColor }
        : (BACKGROUNDS.find(b => b.id === settings.bgId) ?? BACKGROUNDS[0])

    return (
        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-4 w-full p-4 min-h-[calc(100vh-8rem)]`}>

            {/* Preview canvas */}
            <div
                ref={containerRef}
                className="flex-1 relative overflow-hidden rounded-2xl select-none"
                style={{
                    aspectRatio: settings.canvasRatio,
                    alignSelf: 'flex-start',
                    minHeight: isMobile ? 260 : undefined,
                    background: isTransparent ? undefined : bg.css,
                    cursor: modelReady ? 'grab' : 'wait',
                }}
            >
                {isTransparent && (
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute', inset: 0, pointerEvents: 'none',
                            backgroundImage: 'repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%)',
                            backgroundSize: '20px 20px',
                        }}
                    />
                )}

                {!modelReady && !glError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900/80 backdrop-blur-sm z-10">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                        <div className="text-xs text-zinc-400 font-jakarta">Loading 3D model… {loadProgress > 0 ? `${loadProgress}%` : ''}</div>
                        {loadProgress > 0 && (
                            <div className="w-40 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 transition-all duration-200" style={{ width: `${loadProgress}%` }} />
                            </div>
                        )}
                    </div>
                )}
                {glError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900/90 z-10 px-6 text-center">
                        <p className="text-sm text-red-400 font-jakarta">{glError}</p>
                        <Button variant="secondary" size="sm" onClick={() => { setGlError(''); setBootKey(k => k + 1) }}>Retry</Button>
                    </div>
                )}

                {/* Focus toggle */}
                <button
                    data-export-skip
                    onClick={() => setFocused(!focused)}
                    title={focused ? 'Exit focused mode' : 'Focused mode'}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/30 backdrop-blur-sm text-zinc-400 hover:text-white transition-colors z-10"
                >
                    {focused
                        ? <Minimize2 className="w-3.5 h-3.5" />
                        : <Maximize2 className="w-3.5 h-3.5" />}
                </button>

                {recording && (
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-jakarta font-bold px-2.5 py-1 rounded-full z-10">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" /> RECORDING
                    </div>
                )}

                {modelReady && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm text-zinc-400 text-[10px] font-jakarta px-3 py-1 rounded-full select-none pointer-events-none z-10">
                        <span>Drag to orbit</span>
                        <span className="opacity-40">·</span>
                        <span>Scroll to zoom</span>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div
                className={`flex flex-col ${isMobile ? 'w-full' : 'w-[268px]'} shrink-0 overflow-hidden`}
                style={{ maxHeight: isMobile ? 'none' : '85vh' }}
            >
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-2" style={{ minHeight: 0 }}>

                    {/* Fold */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3.5">
                        <p className="text-[10px] font-bold tracking-[0.15em] text-zinc-500 uppercase font-jakarta flex items-center gap-1.5">
                            <Box className="w-3 h-3 text-indigo-400" /> Fold Motion
                        </p>
                        <Slider label="Open" tooltip="0 = folded shut, 1 = fully open (scrub pauses the loop)" value={Math.round(settings.fold * 100)} min={0} max={100} step={1} unit="%" defaultValue={DEFAULTS.fold * 100} onChange={v => { set('fold', v / 100); set('loop', false); stopForScrub(v / 100) }} />
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => { set('loop', !settings.loop); if (settings.loop) { stopForScrub() } else { cycleRef.current = modeRef.current === 'settled' ? CLIP_MAX_TIME : 0; modeRef.current = 'loop' } }}
                                title="Loop the fold open and closed"
                                className={`flex-1 py-1.5 rounded-lg border text-xs font-jakarta font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                    settings.loop
                                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                        : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                                }`}
                            >
                                {settings.loop ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                {settings.loop ? 'Looping fold' : 'Loop fold'}
                            </button>
                            <button
                                onClick={playIntro}
                                title="Replay the Apple entrance reveal"
                                className={`flex-1 py-1.5 rounded-lg border text-xs font-jakarta font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                    modeRef.current === 'intro'
                                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                        : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                                }`}
                            >
                                <Sparkles className="w-3 h-3" /> Reveal
                            </button>
                        </div>
                    </div>

                    {/* Camera */}
                    <div>
                        <p className="text-[10px] font-bold tracking-[0.15em] text-zinc-500 uppercase font-jakarta mb-2">Camera</p>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {CAMERA_PRESETS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setActivePreset(p.id)}
                                    className={`px-3 py-1 rounded-lg text-xs font-jakarta font-semibold transition-all border ${
                                        activePreset === p.id
                                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                            <button
                                onClick={() => set('turntable', !settings.turntable)}
                                title="Slowly rotate the scene"
                                className={`px-3 py-1 rounded-lg text-xs font-jakarta font-semibold transition-all border flex items-center gap-1 ${
                                    settings.turntable
                                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
                                }`}
                            >
                                <Orbit className="w-3 h-3" /> Turntable
                            </button>
                        </div>
                    </div>

                    {/* Canvas ratio */}
                    <div>
                        <p className="text-[10px] font-bold tracking-[0.15em] text-zinc-500 uppercase font-jakarta mb-2">Canvas Ratio</p>
                        <div className="flex gap-1">
                            {CANVAS_RATIOS.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => set('canvasRatio', r.id)}
                                    className={`flex-1 py-1 rounded-md text-[10px] font-jakarta font-semibold transition-all border ${
                                        settings.canvasRatio === r.id
                                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                                    }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Screen */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3.5">
                        <p className="text-[10px] font-bold tracking-[0.15em] text-zinc-500 uppercase font-jakarta flex items-center gap-1.5">
                            <MonitorSmartphone className="w-3 h-3 text-indigo-400" /> Screen Content
                        </p>
                        <div className="flex gap-1">
                            {(['cover', 'contain'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => { set('screenFit', f); if (mediaElRef.current) requestAnimationFrame(() => redrawScreen()) }}
                                    className={`flex-1 py-1 rounded-md text-[11px] font-jakarta font-semibold capitalize transition-all border ${
                                        settings.screenFit === f
                                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                            : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                        <Slider label="Zoom" tooltip="Scale of the content on the displays" value={settings.screenZoom} min={0.2} max={4} step={0.01} unit="×" defaultValue={DEFAULTS.screenZoom} onChange={v => set('screenZoom', v)} />
                        <Slider label="Offset X" tooltip="Move the content left or right" value={settings.screenX} min={-100} max={100} step={1} unit="%" defaultValue={DEFAULTS.screenX} onChange={v => set('screenX', v)} />
                        <Slider label="Offset Y" tooltip="Move the content up or down" value={settings.screenY} min={-100} max={100} step={1} unit="%" defaultValue={DEFAULTS.screenY} onChange={v => set('screenY', v)} />
                        <Slider label="Glow" tooltip="Display brightness (emissive intensity)" value={settings.brightness} min={0} max={3} step={0.05} unit="×" defaultValue={DEFAULTS.brightness} onChange={v => set('brightness', v)} />
                    </div>

                    {/* Lighting */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3.5">
                        <p className="text-[10px] font-bold tracking-[0.15em] text-zinc-500 uppercase font-jakarta flex items-center gap-1.5">
                            <SlidersHorizontal className="w-3 h-3 text-indigo-400" /> Lighting
                        </p>
                        <Slider label="Key Angle" tooltip="Rotate the studio key light around the scene" value={settings.lightAngle} min={0} max={360} step={1} unit="°" defaultValue={DEFAULTS.lightAngle} onChange={v => set('lightAngle', v)} />
                        <Slider label="Ambient" tooltip="Strength of the HDRI environment reflections" value={settings.envIntensity} min={0} max={2.5} step={0.05} unit="×" defaultValue={DEFAULTS.envIntensity} onChange={v => set('envIntensity', v)} />
                    </div>

                    {/* Background */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <p className="text-[10px] font-bold tracking-[0.12em] text-zinc-500 uppercase font-jakarta mb-2">Background</p>
                        <div className="grid grid-cols-4 gap-1.5 mb-2">
                            {BACKGROUNDS.map(b2 => (
                                <button
                                    key={b2.id}
                                    title={b2.label}
                                    onClick={() => set('bgId', b2.id)}
                                    className={`h-8 rounded-lg border-2 transition-all ${
                                        settings.bgId === b2.id ? 'border-indigo-400 scale-[1.07]' : 'border-zinc-700 hover:border-zinc-500'
                                    }`}
                                    style={{ background: b2.css === 'transparent' ? 'repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%)' : b2.css, backgroundSize: b2.css === 'transparent' ? '10px 10px' : undefined }}
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={customBgColor}
                                onChange={e => { setCustomBgColor(e.target.value); set('bgId', 'custom') }}
                                className="w-8 h-7 rounded cursor-pointer bg-transparent border border-zinc-700 p-0.5 shrink-0"
                                title="Pick a custom background color"
                            />
                            <input
                                type="text"
                                value={settings.bgId === 'custom' ? customBgColor : ''}
                                placeholder="Custom hex…"
                                onChange={e => { setCustomBgColor(e.target.value); set('bgId', 'custom') }}
                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-indigo-500/50 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Reset row */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setSettings(DEFAULTS); setActivePreset('hero') }}
                            className="flex-1 py-1.5 text-xs text-zinc-600 hover:text-zinc-400 font-jakarta transition-all flex items-center justify-center gap-1"
                        >
                            <RotateCcw className="w-3 h-3" /> Reset settings
                        </button>
                        <button
                            onClick={handleReset}
                            className="flex-1 py-1.5 text-xs text-zinc-600 hover:text-zinc-400 font-jakarta transition-all"
                        >
                            Clear content
                        </button>
                    </div>
                </div>

                {/* Export */}
                <div className="pt-2 border-t border-zinc-800 shrink-0 flex flex-col gap-2">
                    <div className="flex gap-1">
                        {[1, 2, 3].map(s => (
                            <button
                                key={s}
                                onClick={() => set('exportScale', s)}
                                className={`flex-1 py-1 rounded-md text-[10px] font-jakarta font-semibold transition-all border ${
                                    settings.exportScale === s
                                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                                }`}
                            >
                                {s}×
                            </button>
                        ))}
                    </div>
                    <Button
                        onClick={handleExportVideo}
                        disabled={recording || exporting || !modelReady}
                        variant="secondary"
                        className="w-full flex items-center justify-center gap-2"
                        title="Records a 4.4-second fold cycle from your current camera angle"
                    >
                        {recording ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
                        {recording ? 'Recording fold…' : 'Export Fold Video'}
                    </Button>
                    <Button
                        onClick={handleExport}
                        disabled={recording || exporting || !modelReady}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                    >
                        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {exporting ? 'Rendering…' : `Export PNG (${settings.exportScale * 100}%)`}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default Mockup3D


