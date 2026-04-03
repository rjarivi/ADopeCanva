import React, { useState, useRef, useCallback, useEffect } from 'react'
import { toPng } from 'html-to-image'
import {
    Download, RotateCcw, Image as ImageIcon,
    Sparkles, Camera, Focus, Layers, SlidersHorizontal, ExternalLink,
    Globe, Loader2, Link, Maximize2, Minimize2, ChevronDown,
} from 'lucide-react'
import { FileUploader } from '../../components/FileUploader'
import { Button } from '../../components/ui/Button'
import { useIsMobile } from '../../hooks/useIsMobile'
import { FileData } from '../../types'
import { useFocusedMode } from '../../contexts/FocusedMode'

// ─── Types ────────────────────────────────────────────────────────────────────

type DofType = 'off' | 'tilt' | 'radial' | 'dir' | 'lens'

interface Settings {
    tiltX: number
    tiltY: number
    roll: number
    zoom: number
    posX: number
    posY: number
    perspective: number
    dofType: DofType
    blur: number
    dofDirection: number
    canvasBlur: boolean
    borderRadius: number
    bgId: string
    shadow: boolean
    bloom: boolean
    canvasRatio: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULTS: Settings = {
    tiltX: 6, tiltY: -20, roll: 4, zoom: 1.18, posX: -10, posY: 100,
    perspective: 900,
    dofType: 'dir', blur: 0.5, dofDirection: 151, canvasBlur: false,
    borderRadius: 12, bgId: 'indigo', shadow: true, bloom: false,
    canvasRatio: '16/9',
}

const CANVAS_RATIOS = [
    { id: '16/9',  label: '16:9' },
    { id: '4/3',   label: '4:3' },
    { id: '1/1',   label: '1:1' },
    { id: '9/16',  label: '9:16' },
    { id: '21/9',  label: '21:9' },
]

const DOF_TOOLTIPS: Record<DofType, string> = {
    off:    'No depth-of-field blur',
    tilt:   'Blurs top and bottom edges — simulates tilt-shift lens',
    radial: 'Blurs edges around the center point',
    dir:    'Directional blur from a sharp edge toward one side',
    lens:   'Circular blur expanding outward from center (bokeh)',
}

const PRESETS: { name: string; s: Partial<Settings> }[] = [
    { name: 'Flat',      s: { tiltX: 0,  tiltY: 0,   roll: 0, zoom: 1,    posX: 0,   posY: 0,   dofType: 'off',  blur: 0,   bgId: 'light' } },
    { name: 'Cinematic', s: { tiltX: 6,  tiltY: -20, roll: 4, zoom: 1.18, posX: -10, posY: 100, dofType: 'dir',  blur: 0.5, dofDirection: 151, bgId: 'indigo' } },
    { name: 'Tilt',      s: { tiltX: 8,  tiltY: -18, roll: 3, zoom: 1.4,  posX: 60,  posY: 80,  dofType: 'tilt', blur: 1.1, bgId: 'ocean' } },
    { name: 'Side',      s: { tiltX: 5,  tiltY: -38, roll: 3, zoom: 1.8,  posX: 280, posY: 120, dofType: 'dir',  blur: 1.2, dofDirection: 160, bgId: 'sunset' } },
    { name: 'Overhead',  s: { tiltX: 22, tiltY: 0,   roll: 0, zoom: 1.3,  posX: 0,   posY: -80, dofType: 'tilt', blur: 0.8, bgId: 'forest' } },
    { name: 'Dramatic',  s: { tiltX: 8,  tiltY: -28, roll: 6, zoom: 2,    posX: 340, posY: 180, dofType: 'lens', blur: 1.5, bgId: 'mesh' } },
]

const BACKGROUNDS: { id: string; label: string; value: string }[] = [
    { id: 'light',       label: 'Light',       value: '#e5e5e5' },
    { id: 'white',       label: 'White',       value: '#ffffff' },
    { id: 'dark',        label: 'Dark',        value: '#1c1c1e' },
    { id: 'transparent', label: 'Transparent', value: 'transparent' },
    { id: 'indigo',      label: 'Indigo',      value: 'linear-gradient(135deg,#3730a3,#818cf8)' },
    { id: 'sunset',      label: 'Sunset',      value: 'linear-gradient(135deg,#ea580c,#db2777)' },
    { id: 'ocean',       label: 'Ocean',       value: 'linear-gradient(135deg,#0369a1,#4f46e5)' },
    { id: 'forest',      label: 'Forest',      value: 'linear-gradient(135deg,#065f46,#0f766e)' },
    { id: 'mesh',        label: 'Mesh',        value: 'radial-gradient(ellipse at 20% 30%,#4338ca,transparent 60%),radial-gradient(ellipse at 80% 70%,#7c3aed,transparent 60%),#0f0f1a' },
]

const DOF_TYPES: { id: DofType; label: string }[] = [
    { id: 'off',    label: 'Off' },
    { id: 'tilt',   label: 'Tilt' },
    { id: 'radial', label: 'Radial' },
    { id: 'dir',    label: 'Dir' },
    { id: 'lens',   label: 'Lens' },
]

// ─── Progressive DOF blur masks ───────────────────────────────────────────────
// Five layered blur passes (lightest → max, rendered bottom → top).
// Each higher-blur layer is visible in a NARROWER region (extreme edges only).
// Wide 28% feather zone + mid-opacity easing stop for cinematic softness.

function getLayerMask(type: DofType, blurLevel: number, direction: number): string {
    // blurLevel: 0 = lightest layer, 1 = strongest layer
    if (type === 'tilt') {
        // Both top and bottom blur. Centre zone shrinks as blurLevel increases.
        const coverage = (0.42 - blurLevel * 0.30) * 100 // 42% → 12% clear centre half-width
        const fade = 18                                    // wide feather
        const p1 = Math.max(0, coverage - fade).toFixed(1)
        const p2 = coverage.toFixed(1)
        const p3 = (100 - coverage).toFixed(1)
        const p4 = Math.min(100, 100 - coverage + fade).toFixed(1)
        return `linear-gradient(to bottom, black 0%, black ${p1}%, transparent ${p2}%, transparent ${p3}%, black ${p4}%, black 100%)`
    }
    if (type === 'radial') {
        const inner = (0.72 - blurLevel * 0.32) * 100
        const mid   = Math.min(inner + 15, 100)
        const outer = Math.min(inner + 30, 100)
        return `radial-gradient(ellipse at center, transparent ${inner.toFixed(0)}%, rgba(0,0,0,0.5) ${mid.toFixed(0)}%, black ${outer.toFixed(0)}%)`
    }
    if (type === 'lens') {
        const inner = (0.52 - blurLevel * 0.30) * 100
        const mid   = Math.min(inner + 16, 100)
        const outer = Math.min(inner + 32, 100)
        return `radial-gradient(circle at center, transparent ${inner.toFixed(0)}%, rgba(0,0,0,0.5) ${mid.toFixed(0)}%, black ${outer.toFixed(0)}%)`
    }
    if (type === 'dir') {
        // ONE-SIDED: transparent (sharp) at start → blurry at direction end.
        // 5 layers each reveal themselves progressively further from the sharp edge.
        // 28% feather + mid-stop at 50% opacity for smooth easing.
        const sharpEnd = (0.08 + blurLevel * 0.57) * 100  // 8% → 65% across 5 levels
        const midStop  = Math.min(sharpEnd + 14, 100)
        const blurEnd  = Math.min(sharpEnd + 28, 100)
        return `linear-gradient(${direction}deg, transparent 0%, transparent ${sharpEnd.toFixed(1)}%, rgba(0,0,0,0.5) ${midStop.toFixed(1)}%, black ${blurEnd.toFixed(1)}%)`
    }
    return 'none'
}

// ─── Canvas blur overlay mask ─────────────────────────────────────────────────
// Single gradient used for the backdrop-filter overlay on the preview canvas.
// Transparent = scene shows through sharply; opaque = backdrop blur is visible.

function getCanvasMask(type: DofType, direction: number): string {
    if (type === 'tilt') {
        return 'linear-gradient(to bottom, black 0%, transparent 30%, transparent 70%, black 100%)'
    }
    if (type === 'radial') {
        return 'radial-gradient(ellipse at center, transparent 35%, black 70%)'
    }
    if (type === 'lens') {
        return 'radial-gradient(circle at center, transparent 30%, black 65%)'
    }
    if (type === 'dir') {
        return `linear-gradient(${direction}deg, transparent 0%, transparent 30%, black 55%)`
    }
    return 'none'
}

// ─── Slider ───────────────────────────────────────────────────────────────────

function Slider({ label, value, min, max, step = 1, unit = '', tooltip, defaultValue, onChange }: {
    label: string; value: number; min: number; max: number; step?: number; unit?: string
    tooltip?: string; defaultValue?: number
    onChange: (v: number) => void
}) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft]     = useState('')
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

// ─── Component ────────────────────────────────────────────────────────────────

export const DeviceMockup: React.FC = () => {
    const isMobile = useIsMobile()
    const previewRef   = useRef<HTMLDivElement>(null)
    const imageWrapRef = useRef<HTMLDivElement>(null)

    const [fileData, setFileData]   = useState<FileData | null>(null)
    const [imageUrl, setImageUrl]   = useState<string | null>(null)
    const [settings, setSettings]   = useState<Settings>(DEFAULTS)
    const [exporting, setExporting] = useState(false)
    const { focused, setFocused }   = useFocusedMode()
    const [activePreset, setActivePreset] = useState<string | null>(null)
    const [openSections, setOpenSections] = useState({ camera: true, dof: false, style: false })
    const [customBgColor, setCustomBgColor] = useState('#6366f1')

    const toggleSection = (s: keyof typeof openSections) =>
        setOpenSections(prev => ({
            camera: false, dof: false, style: false,
            [s]: !prev[s],
        }))
    const [isDragging, setIsDragging] = useState(false)
    const [inputMode, setInputMode]   = useState<'upload' | 'url'>('upload')
    const [urlInput, setUrlInput]     = useState('')
    const [capturing, setCapturing]   = useState(false)
    const [captureError, setCaptureError] = useState('')
    const [isExternalImage, setIsExternalImage] = useState(false)

    // Drag state tracked in refs to avoid stale closures
    const dragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 })

    const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }))
        setActivePreset(null)
    }, [])

    const applyPreset = (preset: typeof PRESETS[0]) => {
        setSettings(prev => ({ ...prev, ...preset.s }))
        setActivePreset(preset.name)
    }

    const handleFile = useCallback((fd: FileData) => {
        setFileData(fd)
        setImageUrl(fd.previewUrl ?? URL.createObjectURL(fd.file))
        setIsExternalImage(false)
    }, [])

    const handleReset = () => {
        setFileData(null)
        if (imageUrl && !isExternalImage) URL.revokeObjectURL(imageUrl)
        setImageUrl(null)
        setSettings(DEFAULTS)
        setActivePreset(null)
        setUrlInput('')
        setCaptureError('')
        setIsExternalImage(false)
    }

    const handleUrlCapture = async (urlOverride?: string) => {
        const raw = (urlOverride ?? urlInput).trim()
        if (!raw) return
        const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
        setCaptureError('')
        setCapturing(true)
        try {
            let shotUrl = ''

            // ── Primary: microlink.io (free, no API key, reliable) ────────────
            try {
                const controller = new AbortController()
                const timer = setTimeout(() => controller.abort(), 20000)
                const res = await fetch(
                    `https://api.microlink.io/?url=${encodeURIComponent(normalized)}&screenshot=true&meta=false`,
                    { signal: controller.signal }
                )
                clearTimeout(timer)
                const json = await res.json()
                if (json.status === 'success' && json.data?.screenshot?.url) {
                    shotUrl = json.data.screenshot.url
                }
            } catch {
                // fall through to next service
            }

            // ── Fallback: thum.io (authenticated) ────────────────────────────
            // Note: can't probe with new Image() under COEP — use directly
            if (!shotUrl) {
                shotUrl = `https://image.thum.io/get/auth/77069-adopecanva.com/width/1280/noanimate/${normalized}`
            }

            if (!shotUrl) throw new Error('Could not capture this URL — try uploading a screenshot directly instead')
            setFileData({ file: new File([], 'screenshot.png'), size: '—', type: 'image/png', previewUrl: shotUrl })
            setImageUrl(shotUrl)
            setIsExternalImage(true)
        } catch (err: unknown) {
            setCaptureError(err instanceof Error ? err.message : 'Capture failed')
        } finally {
            setCapturing(false)
        }
    }

    // ── Drag to pan ───────────────────────────────────────────────────────────

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return
        dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, originX: settings.posX, originY: settings.posY }
        setIsDragging(true)
        e.preventDefault()
    }, [settings.posX, settings.posY])

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        const t = e.touches[0]
        dragRef.current = { active: true, startX: t.clientX, startY: t.clientY, originX: settings.posX, originY: settings.posY }
        setIsDragging(true)
    }, [settings.posX, settings.posY])

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragRef.current.active) return
            const dx = e.clientX - dragRef.current.startX
            const dy = e.clientY - dragRef.current.startY
            setSettings(prev => ({ ...prev, posX: dragRef.current.originX + dx, posY: dragRef.current.originY + dy }))
        }
        const onTouchMove = (e: TouchEvent) => {
            if (!dragRef.current.active) return
            const t = e.touches[0]
            const dx = t.clientX - dragRef.current.startX
            const dy = t.clientY - dragRef.current.startY
            setSettings(prev => ({ ...prev, posX: dragRef.current.originX + dx, posY: dragRef.current.originY + dy }))
        }
        const onUp = () => { dragRef.current.active = false; setIsDragging(false) }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        window.addEventListener('touchmove', onTouchMove, { passive: true })
        window.addEventListener('touchend', onUp)
        return () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
            window.removeEventListener('touchmove', onTouchMove)
            window.removeEventListener('touchend', onUp)
        }
    }, [])

    // ── Scroll to zoom ────────────────────────────────────────────────────────

    useEffect(() => {
        const el = previewRef.current
        if (!el) return
        const onWheel = (e: WheelEvent) => {
            e.preventDefault()
            const factor = e.deltaY < 0 ? 1.06 : 0.95
            setSettings(prev => ({ ...prev, zoom: Math.max(0.3, Math.min(5, prev.zoom * factor)) }))
            setActivePreset(null)
        }
        el.addEventListener('wheel', onWheel, { passive: false })
        return () => el.removeEventListener('wheel', onWheel)
    // Re-run when imageUrl changes so the listener attaches after the
    // preview canvas mounts (previewRef is null until a file is loaded).
    }, [imageUrl])


    // ── Export ────────────────────────────────────────────────────────────────

    const handleExport = useCallback(async () => {
        if (!imageUrl || !previewRef.current) return
        setExporting(true)

        // Temporarily disable cross-origin stylesheets so html-to-image
        // doesn't hit SecurityError reading cssRules from Google Fonts etc.
        const disabledSheets: CSSStyleSheet[] = []
        for (const sheet of Array.from(document.styleSheets)) {
            try {
                if (sheet.href && !sheet.href.startsWith(window.location.origin)) {
                    sheet.disabled = true
                    disabledSheets.push(sheet)
                }
            } catch { /* cross-origin sheet — already inaccessible, skip */ }
        }

        try {
            const rect  = previewRef.current.getBoundingClientRect()
            const ratio = 3840 / rect.width

            const dataUrl = await toPng(previewRef.current, {
                pixelRatio: ratio,
                skipFonts: true,
                // Transparent bg: force canvas to stay clear so PNG alpha works
                ...(settings.bgId === 'transparent' && { backgroundColor: 'rgba(0,0,0,0)' }),
                // Skip UI chrome (hint label, focus button, checkerboard overlay)
                filter: (node) =>
                    !(node instanceof Element && node.hasAttribute('data-export-skip')),
            })

            const a = document.createElement('a')
            a.href     = dataUrl
            a.download = `cinematic-mockup-${Date.now()}.png`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        } catch (err) {
            console.error('Export failed:', err)
        } finally {
            // Re-enable stylesheets regardless of success or failure
            for (const sheet of disabledSheets) sheet.disabled = false
            setExporting(false)
        }
    }, [imageUrl, isExternalImage, settings])

    const { tiltX, tiltY, roll, zoom, posX, posY, perspective,
            dofType, blur, dofDirection, canvasBlur, borderRadius, bgId, shadow, bloom, canvasRatio } = settings

    const bg = bgId === 'custom'
        ? { id: 'custom', label: 'Custom', value: customBgColor }
        : (BACKGROUNDS.find(b => b.id === bgId) ?? BACKGROUNDS[0])
    const hasDof   = dofType !== 'off' && blur > 0
    const maxBlurPx = blur * 20

    // Three progressive blur levels: light (index 0, behind) → max (index 2, in front)
    // Only used when canvasBlur is OFF (image-layer DOF mode)
    const DOF_LEVELS = hasDof && !canvasBlur ? [0, 0.25, 0.5, 0.75, 1] as const : []

    const boxShadow = shadow
        ? '0 70px 140px rgba(0,0,0,0.65), 0 30px 60px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.06)'
        : 'none'

    const transform3D = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) rotateZ(${roll}deg) scale(${zoom}) translateX(${posX}px) translateY(${posY}px)`

    // ─── Initial state ────────────────────────────────────────────────────────

    if (!fileData || !imageUrl) {
        return (
            <div className="flex flex-col items-center justify-center w-full min-h-[80vh] animate-fade-in px-4 py-12">
                <div className="flex flex-col items-center text-center mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
                        <Camera className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h1 className="font-unbounded text-3xl font-black tracking-tight bg-gradient-to-r from-indigo-400 to-indigo-200 bg-clip-text text-transparent mb-3">
                        Mockup Generator
                    </h1>
                    <p className="text-zinc-400 text-base max-w-md">
                        Turn flat screenshots into cinematic 3D presentations — perspective, depth-of-field, drag & zoom.
                    </p>
                </div>
                {/* Input mode tabs + input area */}
                <div className="w-full max-w-xl mb-12">
                    <div className="flex rounded-xl border border-zinc-800 overflow-hidden mb-4">
                        {(['upload', 'url'] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => { setInputMode(mode); setCaptureError('') }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-jakarta font-semibold transition-all ${
                                    inputMode === mode
                                        ? 'bg-indigo-500/15 text-indigo-300 border-r-0'
                                        : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                {mode === 'upload' ? <ImageIcon className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                {mode === 'upload' ? 'Upload Image' : 'Capture URL'}
                            </button>
                        ))}
                    </div>

                    {inputMode === 'upload' ? (
                        <FileUploader onFileSelect={handleFile} accept="image/*" label="Upload Screenshot" description="PNG, JPG, WebP" icon={ImageIcon} />
                    ) : (
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                                <div className="flex-1 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus-within:border-indigo-500/50 transition-colors">
                                    <Link className="w-4 h-4 text-zinc-600 shrink-0" />
                                    <input
                                        type="url"
                                        value={urlInput}
                                        onChange={e => { setUrlInput(e.target.value); setCaptureError('') }}
                                        onKeyDown={e => e.key === 'Enter' && handleUrlCapture()}
                                        placeholder="https://example.com"
                                        className="flex-1 bg-transparent text-white text-sm font-jakarta outline-none placeholder:text-zinc-600"
                                    />
                                </div>
                                <button
                                    onClick={() => handleUrlCapture()}
                                    disabled={capturing || !urlInput.trim()}
                                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-jakarta font-semibold transition-all"
                                >
                                    {capturing
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <Globe className="w-4 h-4" />}
                                    {capturing ? 'Capturing…' : 'Capture'}
                                </button>
                            </div>
                            {captureError && (
                                <p className="text-xs text-red-400 font-jakarta">{captureError}</p>
                            )}
                            <p className="text-xs text-zinc-600 font-jakarta">
                                Screenshots powered by{' '}
                                <a href="https://microlink.io" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">microlink.io</a>
                                {' '}— no API key required.
                            </p>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
                    {[
                        { icon: Camera,            title: '3D Camera',          desc: 'Tilt, roll, zoom & pan with full perspective control' },
                        { icon: Focus,             title: 'Progressive DOF',     desc: '3-layer depth-of-field: smooth blur falloff like a real lens' },
                        { icon: Sparkles,          title: 'Cinematic Presets',   desc: '5 one-click looks: Flat, Tilt, Side, Overhead, Dramatic' },
                        { icon: SlidersHorizontal, title: 'Drag & Scroll',       desc: 'Drag to reposition, scroll wheel to zoom, live preview' },
                    ].map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="flex flex-col gap-2 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                            <Icon className="w-5 h-5 text-indigo-400" />
                            <p className="font-jakarta font-semibold text-white text-sm">{title}</p>
                            <p className="font-jakarta text-zinc-500 text-xs">{desc}</p>
                        </div>
                    ))}
                </div>

                {/* Credit */}
                <p className="mt-6 text-xs text-zinc-600">
                    Inspired by{' '}
                    <a
                        href="https://ultramock.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-500 hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
                    >
                        Ultramock <ExternalLink size={10} />
                    </a>
                    {' '}— cinematic browser mockups
                </p>
            </div>
        )
    }

    // ─── Active state ─────────────────────────────────────────────────────────

    const isTransparent = bgId === 'transparent'

    return (
        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-4 w-full p-4 min-h-[calc(100vh-8rem)]`}>

            {/* ── Preview canvas ───────────────────────────────────────────── */}
            <div
                ref={previewRef}
                className="flex-1 relative overflow-hidden rounded-2xl flex items-center justify-center select-none"
                style={{
                    background: isTransparent ? 'transparent' : bg.value,
                    aspectRatio: canvasRatio,
                    alignSelf: 'flex-start',
                    minHeight: isMobile ? 220 : undefined,
                    cursor: isDragging ? 'grabbing' : 'grab',
                }}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
            >
                {/* Checkerboard for transparent bg — excluded from export */}
                {isTransparent && (
                    <div
                        data-export-skip
                        aria-hidden
                        style={{
                            position: 'absolute', inset: 0, pointerEvents: 'none',
                            backgroundImage: 'repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%)',
                            backgroundSize: '20px 20px',
                        }}
                    />
                )}
                {/* The perspective context must be on a non-transforming parent */}
                <div style={{ perspective: `${perspective}px`, perspectiveOrigin: '50% 50%' }}>
                    {/*
                      * IMPORTANT layering:
                      * Outer div  → 3D transform + boxShadow only. NO overflow:hidden here —
                      *   CSS `filter: blur()` on children bleeds outside bounds, and 3D
                      *   transforms break overflow clipping in all browsers.
                      * Inner div  → overflow:hidden + borderRadius. This clips the blur bleed
                      *   in the element's LOCAL coordinate space, before the 3D transform.
                      */}
                    <div
                        ref={imageWrapRef}
                        style={{
                            transform: transform3D,
                            transformOrigin: 'center center',
                            transformStyle: 'preserve-3d',
                            transition: 'none',
                            display: 'inline-block',
                            boxShadow,
                        }}
                    >
                        {/* Inner clip: properly clips blur bleed before perspective is applied */}
                        <div
                            style={{
                                position: 'relative',
                                overflow: 'hidden',
                                borderRadius,
                                lineHeight: 0,
                                display: 'block',
                            }}
                        >
                            {/* Base sharp image */}
                            <img
                                src={imageUrl}
                                alt="mockup"
                                draggable={false}
                                crossOrigin={isExternalImage ? 'anonymous' : undefined}
                                style={{
                                    display: 'block',
                                    maxWidth: isMobile ? '85vw' : '62vw',
                                    maxHeight: isMobile ? 240 : 480,
                                    filter: bloom ? 'brightness(1.12) saturate(1.18)' : undefined,
                                    userSelect: 'none',
                                }}
                            />

                            {/* ── Progressive DOF blur layers ──────────────── */}
                            {hasDof && DOF_LEVELS.map((level: number) => {
                                const blurPx = maxBlurPx * (0.25 + level * 0.75)
                                const mask   = getLayerMask(dofType, level, dofDirection)
                                return (
                                    <img
                                        key={level}
                                        src={imageUrl}
                                        alt=""
                                        aria-hidden
                                        draggable={false}
                                        crossOrigin={isExternalImage ? 'anonymous' : undefined}
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            // No scale() here — that was causing the
                                            // "soul leaving body" ghost artifact
                                            filter: `blur(${blurPx}px)`,
                                            pointerEvents: 'none',
                                            userSelect: 'none',
                                            WebkitMaskImage: mask,
                                            maskImage: mask,
                                            WebkitMaskSize: '100% 100%',
                                            maskSize: '100% 100%',
                                        }}
                                    />
                                )
                            })}

                            {/* Subtle gloss highlight (top-left edge) */}
                            <div
                                aria-hidden
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    pointerEvents: 'none',
                                    background: 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, transparent 45%)',
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Canvas blur overlay ──────────────────────────────────── */}
                {/* Sits on top of everything: backdrop-filter blurs the whole scene */}
                {hasDof && canvasBlur && (
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'none',
                            backdropFilter: `blur(${maxBlurPx}px)`,
                            WebkitBackdropFilter: `blur(${maxBlurPx}px)`,
                            WebkitMaskImage: getCanvasMask(dofType, dofDirection),
                            maskImage: getCanvasMask(dofType, dofDirection),
                            WebkitMaskSize: '100% 100%',
                            maskSize: '100% 100%',
                        }}
                    />
                )}

                {/* Hint label — excluded from export */}
                <div data-export-skip className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm text-zinc-400 text-[10px] font-jakarta px-3 py-1 rounded-full select-none pointer-events-none">
                    <span>Drag to pan</span>
                    <span className="opacity-40">·</span>
                    <span>Scroll to zoom</span>
                </div>

                {/* Focus toggle — excluded from export */}
                <button
                    data-export-skip
                    onClick={() => setFocused(!focused)}
                    title={focused ? 'Exit focused mode' : 'Focused mode'}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/30 backdrop-blur-sm text-zinc-400 hover:text-white transition-colors"
                >
                    {focused
                        ? <Minimize2 className="w-3.5 h-3.5" />
                        : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
            </div>

            {/* ── Controls ─────────────────────────────────────────────────── */}
            <div
                className={`flex flex-col ${isMobile ? 'w-full' : 'w-[268px]'} shrink-0 overflow-hidden`}
                style={{ maxHeight: isMobile ? 'none' : '85vh' }}
            >
                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-2" style={{ minHeight: 0 }}>
                    {/* Presets */}
                    <div>
                        <p className="text-[10px] font-bold tracking-[0.15em] text-zinc-500 uppercase font-jakarta mb-2">Presets</p>
                        <div className="flex flex-wrap gap-1.5">
                            {PRESETS.map(p => (
                                <button
                                    key={p.name}
                                    onClick={() => applyPreset(p)}
                                    className={`px-3 py-1 rounded-lg text-xs font-jakarta font-semibold transition-all border ${
                                        activePreset === p.name
                                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
                                    }`}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Canvas Ratio */}
                    <div>
                        <p className="text-[10px] font-bold tracking-[0.15em] text-zinc-500 uppercase font-jakarta mb-2">Canvas Ratio</p>
                        <div className="flex gap-1">
                            {CANVAS_RATIOS.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => set('canvasRatio', r.id)}
                                    className={`flex-1 py-1 rounded-md text-[10px] font-jakarta font-semibold transition-all border ${
                                        canvasRatio === r.id
                                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                                    }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 3D Settings — collapsible */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        <button
                            onClick={() => toggleSection('camera')}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors outline-none"
                        >
                            <span className="text-[10px] font-bold tracking-[0.15em] text-zinc-400 uppercase font-jakarta flex items-center gap-1.5">
                                <Camera className="w-3 h-3" /> 3D Settings
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-zinc-600 transition-transform duration-200 ${openSections.camera ? 'rotate-180' : ''}`} />
                        </button>
                        {openSections.camera && (
                            <div className="px-4 pb-4 flex flex-col gap-3.5 border-t border-zinc-800/50">
                                <Slider label="Tilt X"     tooltip="Rotates the image up or down (X axis)"             value={tiltX} min={-40}  max={40}  step={1}    unit="°"  defaultValue={DEFAULTS.tiltX} onChange={v => set('tiltX', v)} />
                                <Slider label="Tilt Y"     tooltip="Rotates the image left or right (Y axis)"          value={tiltY} min={-50}  max={50}  step={1}    unit="°"  defaultValue={DEFAULTS.tiltY} onChange={v => set('tiltY', v)} />
                                <Slider label="Roll"       tooltip="Rotates the image clockwise or counter-clockwise"  value={roll}  min={-25}  max={25}  step={1}    unit="°"  defaultValue={DEFAULTS.roll}  onChange={v => set('roll', v)} />
                                <Slider label="Zoom"       tooltip="Scale the image in or out"                         value={zoom}  min={0.3}  max={4}   step={0.01} unit="×"  defaultValue={DEFAULTS.zoom}  onChange={v => set('zoom', v)} />
                                <Slider label="Position X" tooltip="Move the image left or right"                      value={posX}  min={-700} max={700} step={2}    unit="px" defaultValue={DEFAULTS.posX}  onChange={v => set('posX', v)} />
                                <Slider label="Position Y" tooltip="Move the image up or down"                         value={posY}  min={-500} max={500} step={2}    unit="px" defaultValue={DEFAULTS.posY}  onChange={v => set('posY', v)} />
                            </div>
                        )}
                    </div>

                    {/* Depth of Field — collapsible */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        <button
                            onClick={() => toggleSection('dof')}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors outline-none"
                        >
                            <span className="text-[10px] font-bold tracking-[0.15em] text-zinc-400 uppercase font-jakarta flex items-center gap-1.5">
                                <Focus className="w-3 h-3" /> Depth of Field
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-zinc-600 transition-transform duration-200 ${openSections.dof ? 'rotate-180' : ''}`} />
                        </button>
                        {openSections.dof && (
                            <div className="px-4 pb-4 flex flex-col gap-3.5 border-t border-zinc-800/50">
                                <div className="flex gap-1">
                                    {DOF_TYPES.map(d => (
                                        <button
                                            key={d.id}
                                            onClick={() => set('dofType', d.id)}
                                            title={DOF_TOOLTIPS[d.id]}
                                            className={`flex-1 py-1 rounded-md text-[11px] font-jakarta font-semibold transition-all border ${
                                                dofType === d.id
                                                    ? 'bg-indigo-500/30 border-indigo-400/70 text-indigo-200 shadow-[0_0_8px_rgba(99,102,241,0.35)]'
                                                    : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                                            }`}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                                <Slider label="Blur" tooltip="Intensity of the depth-of-field blur effect" value={blur} min={0} max={3} step={0.05} unit="×" defaultValue={DEFAULTS.blur} onChange={v => set('blur', v)} />
                                {dofType === 'dir' && (
                                    <Slider label="Direction" tooltip="Angle the blur originates from (0–360°)" value={dofDirection} min={0} max={360} step={1} unit="°" defaultValue={DEFAULTS.dofDirection} onChange={v => set('dofDirection', v)} />
                                )}
                                {hasDof && (
                                    <button
                                        onClick={() => set('canvasBlur', !canvasBlur)}
                                        title={canvasBlur ? 'Scene-wide backdrop blur via CSS filter' : 'Layered blur copies directly on the image'}
                                        className={`w-full py-1.5 rounded-lg border text-xs font-jakarta font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                            canvasBlur
                                                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                                : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                                        }`}
                                    >
                                        <Layers className="w-3 h-3" />
                                        Canvas Blur {canvasBlur ? '— scene overlay' : '— image only'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Style Options — collapsible */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        <button
                            onClick={() => toggleSection('style')}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors outline-none"
                        >
                            <span className="text-[10px] font-bold tracking-[0.15em] text-zinc-400 uppercase font-jakarta flex items-center gap-1.5">
                                <Layers className="w-3 h-3" /> Style Options
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-zinc-600 transition-transform duration-200 ${openSections.style ? 'rotate-180' : ''}`} />
                        </button>
                        {openSections.style && (
                            <div className="px-4 pb-4 flex flex-col gap-3.5 border-t border-zinc-800/50">
                                <div>
                                    <p className="text-[10px] font-bold tracking-[0.12em] text-zinc-500 uppercase font-jakarta mb-2">Background</p>
                                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                                        {BACKGROUNDS.map(b2 => (
                                            <button
                                                key={b2.id}
                                                title={b2.label}
                                                onClick={() => set('bgId', b2.id)}
                                                className={`h-8 rounded-lg border-2 transition-all ${
                                                    bgId === b2.id ? 'border-indigo-400 scale-[1.07]' : 'border-zinc-700 hover:border-zinc-500'
                                                }`}
                                                style={{ background: b2.value }}
                                            />
                                        ))}
                                    </div>
                                    {/* Custom color picker */}
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
                                            value={bgId === 'custom' ? customBgColor : ''}
                                            placeholder="Custom hex…"
                                            onChange={e => { setCustomBgColor(e.target.value); set('bgId', 'custom') }}
                                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-indigo-500/50 transition-colors"
                                        />
                                    </div>
                                </div>

                                <Slider label="Border Radius" tooltip="Round the corners of the screenshot" value={borderRadius} min={0} max={40} step={1} unit="px" defaultValue={DEFAULTS.borderRadius} onChange={v => set('borderRadius', v)} />

                                <div className="flex gap-2">
                                    {(['shadow', 'bloom'] as const).map(key => (
                                        <button
                                            key={key}
                                            onClick={() => set(key, !settings[key])}
                                            title={key === 'shadow' ? 'Add a dramatic drop shadow beneath the image' : 'Boost brightness and saturation for a glowing look'}
                                            className={`flex-1 py-1.5 rounded-lg border text-xs font-jakarta font-semibold capitalize transition-all ${
                                                settings[key]
                                                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                                    : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                                            }`}
                                        >
                                            {key}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reset row */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setSettings(DEFAULTS); setActivePreset(null) }}
                            className="flex-1 py-1.5 text-xs text-zinc-600 hover:text-zinc-400 font-jakarta transition-all flex items-center justify-center gap-1"
                        >
                            <RotateCcw className="w-3 h-3" /> Reset settings
                        </button>
                        <button
                            onClick={handleReset}
                            className="flex-1 py-1.5 text-xs text-zinc-600 hover:text-zinc-400 font-jakarta transition-all"
                        >
                            Clear image
                        </button>
                    </div>

                    {/* Replace screenshot */}
                    <div className="border-t border-zinc-800 pt-3 flex flex-col gap-2">
                        <p className="text-xs text-zinc-600 font-jakarta">Replace screenshot</p>
                        <FileUploader onFileSelect={handleFile} accept="image/*" label="Upload new image" compact />
                        <div className="flex gap-2">
                            <div className="flex-1 flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 focus-within:border-indigo-500/50 transition-colors">
                                <Link className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                                <input
                                    type="url"
                                    value={urlInput}
                                    onChange={e => { setUrlInput(e.target.value); setCaptureError('') }}
                                    onKeyDown={e => e.key === 'Enter' && handleUrlCapture()}
                                    placeholder="https://example.com"
                                    className="flex-1 bg-transparent text-white text-xs font-jakarta outline-none placeholder:text-zinc-600"
                                />
                            </div>
                            <button
                                onClick={() => handleUrlCapture()}
                                disabled={capturing || !urlInput.trim()}
                                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 text-xs font-jakarta font-semibold transition-all border border-zinc-700"
                            >
                                {capturing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                                {capturing ? '' : 'Go'}
                            </button>
                        </div>
                        {captureError && <p className="text-xs text-red-400 font-jakarta">{captureError}</p>}
                    </div>

                    {/* Credit */}
                    <a
                        href="https://ultramock.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-zinc-600 hover:text-indigo-400 transition-colors flex items-center gap-1"
                    >
                        Inspired by Ultramock <ExternalLink size={10} />
                    </a>
                </div>

                {/* Sticky Export — always visible at bottom */}
                <div className="pt-2 border-t border-zinc-800 shrink-0">
                    <Button
                        onClick={handleExport}
                        disabled={exporting}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                    >
                        <Download className="w-4 h-4" />
                        {exporting ? 'Exporting…' : 'Export PNG (3840px)'}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default DeviceMockup
