import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Target, Flag, ZoomIn, ZoomOut, X, CheckCircle2, Lock, Compass, Maximize2, Minimize2, Sparkles, PlayCircle, HelpCircle } from 'lucide-react'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default function InteractiveMap() {
  const [paths, setPaths] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null) // { node, path, isDone, locked }
  const userId = 'guest'

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/paths`)
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        setPaths(data)
      } catch (e) {
        setError('Could not load learning paths. Try bootstrapping the content.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="py-16 text-center text-slate-300">Loading interactive map...</div>
  if (error) return (
    <div className="py-16 text-center">
      <p className="text-slate-300 mb-4">{error}</p>
      <a href={`${API}/bootstrap`} target="_blank" className="text-pink-400 underline">Click here to bootstrap sample content</a>
    </div>
  )

  return (
    <section className="relative py-12">
      <div className="mx-auto max-w-6xl px-6">
        {paths.length === 0 && (
          <p className="text-center text-slate-400">No paths yet. Bootstrap sample content to get started.</p>
        )}
        {paths.map((p) => (
          <InteractivePath key={p.title} path={p} userId={userId} onSelect={setSelected} />
        ))}
      </div>

      {selected && (
        <DetailsSheet selected={selected} userId={userId} onClose={() => setSelected(null)} />)
      }
    </section>
  )
}

function InteractivePath({ path, userId, onSelect }) {
  const [completed, setCompleted] = useState([])
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [hover, setHover] = useState(null) // {x, y, text}
  const [vpSize, setVpSize] = useState({ w: 0, h: 0 })
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const viewportRef = useRef(null)

  useEffect(() => {
    async function loadProgress() {
      const res = await fetch(`${API}/progress/${userId}/${encodeURIComponent(path.title)}`)
      if (res.ok) {
        const data = await res.json()
        setCompleted(data.completed_node_ids || [])
      }
    }
    loadProgress()
  }, [userId, path.title])

  const nodes = useMemo(() => {
    const ordered = [...path.nodes].sort((a,b) => a.order - b.order)
    // Compute positions along a gentle winding path
    const amplitude = 120
    const stepX = 220
    return ordered.map((n, i) => {
      const x = i * stepX
      const y = Math.sin(i / 1.4) * amplitude + (i % 2 === 0 ? 0 : 40)
      return { ...n, x, y }
    })
  }, [path.nodes])

  const world = useMemo(() => {
    if (nodes.length === 0) return { width: 800, height: 400, minX: 0, minY: 0 }
    const minX = Math.min(...nodes.map(n => n.x))
    const maxX = Math.max(...nodes.map(n => n.x))
    const minY = Math.min(...nodes.map(n => n.y))
    const maxY = Math.max(...nodes.map(n => n.y))
    return { width: (maxX - minX) + 320, height: (maxY - minY) + 320, minX, minY }
  }, [nodes])

  // Measure viewport
  useLayoutEffect(() => {
    function measure() {
      if (!viewportRef.current) return
      const rect = viewportRef.current.getBoundingClientRect()
      setVpSize({ w: rect.width, h: rect.height })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Fit content initially or when nodes change
  useEffect(() => {
    fitToView()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world.width, world.height])

  function fitToView() {
    if (!vpSize.w || !vpSize.h) return
    const pad = 120
    const scaleX = (vpSize.w - pad) / world.width
    const scaleY = (vpSize.h - pad) / world.height
    const nextZoom = clamp(Math.min(scaleX, scaleY), 0.5, 2.5)
    setZoom(nextZoom)
    // center content
    const contentW = world.width * nextZoom
    const contentH = world.height * nextZoom
    const cx = (vpSize.w - contentW) / 2
    const cy = (vpSize.h - contentH) / 2
    setOffset({ x: cx, y: cy })
  }

  function centerOnNode(node) {
    if (!vpSize.w || !vpSize.h) return
    const r = 36
    const targetX = node.x + r
    const targetY = node.y + r
    // Keep current zoom, center selected in viewport
    const nx = -(targetX * zoom) + vpSize.w / 2
    const ny = -(targetY * zoom) + vpSize.h / 2
    setOffset({ x: nx, y: ny })
  }

  function onWheel(e) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(z => clamp(z + delta, 0.5, 2.5))
  }

  function onPointerDown(e) {
    dragging.current = true
    last.current = { x: e.clientX, y: e.clientY }
  }
  function onPointerMove(e) {
    if (!dragging.current) return
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y
    last.current = { x: e.clientX, y: e.clientY }
    setOffset(o => ({ x: o.x + dx, y: o.y + dy }))
  }
  function onPointerUp() {
    dragging.current = false
  }

  async function toggle(nodeId) {
    const res = await fetch(`${API}/progress/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, path_title: path.title, node_id: nodeId })
    })
    if (res.ok) {
      const data = await res.json()
      setCompleted(data.completed_node_ids)
    }
  }

  const total = nodes.length
  const doneCount = completed.length
  const percent = total ? Math.round((doneCount / total) * 100) : 0

  // Determine next actionable node (first unlocked and not done)
  const nextNode = useMemo(() => {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      const isDone = completed.includes(n.id)
      const locked = i > 0 && !completed.includes(nodes[i-1].id)
      if (!isDone && !locked) return n
    }
    return null
  }, [nodes, completed])

  return (
    <div className="mb-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
        <div className="flex items-start gap-3">
          <Flag className="mt-1 text-pink-400" />
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-white">{path.title}</h3>
            <p className="text-slate-300 text-sm">{path.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-800 px-2 py-1"><Sparkles className="h-3 w-3"/> {percent}% complete</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-800 px-2 py-1">{doneCount}/{total} goals</span>
              {nextNode && <button onClick={() => centerOnNode(nextNode)} className="inline-flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/10 px-2 py-1 text-sky-300 hover:bg-sky-500/20"><Compass className="h-3 w-3"/> Jump to next</button>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button onClick={() => setZoom(z => clamp(z + 0.2, 0.5, 2.5))} className="p-2 rounded-lg bg-slate-800 border border-white/10 hover:bg-slate-700"><ZoomIn className="h-4 w-4"/></button>
          <button onClick={() => setZoom(z => clamp(z - 0.2, 0.5, 2.5))} className="p-2 rounded-lg bg-slate-800 border border-white/10 hover:bg-slate-700"><ZoomOut className="h-4 w-4"/></button>
          <button onClick={fitToView} className="p-2 rounded-lg bg-slate-800 border border-white/10 hover:bg-slate-700"><Maximize2 className="h-4 w-4"/></button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="relative h-[460px] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Hover tooltip */}
        {hover && (
          <div className="pointer-events-none absolute z-20 rounded-md bg-slate-900/95 px-2 py-1 text-xs text-slate-200 shadow-lg border border-white/10"
               style={{ left: hover.x + 12, top: hover.y + 12 }}>
            {hover.text}
          </div>
        )}

        <svg
          width={world.width}
          height={world.height}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
        >
          {/* Definitions */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="1" />
            </pattern>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Background grid */}
          <rect x="0" y="0" width={world.width} height={world.height} fill="url(#grid)" />

          {/* Connections with smooth curves */}
          {nodes.map((n, i) => {
            if (i === 0) return null
            const prev = nodes[i-1]
            const sx = prev.x + 40
            const sy = prev.y + 40
            const ex = n.x + 40
            const ey = n.y + 40
            const dx = (ex - sx) * 0.5
            const c1x = sx + dx
            const c1y = sy
            const c2x = ex - dx
            const c2y = ey
            const d = `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`
            return (
              <path key={`line-${n.id}`} d={d} stroke="url(#lineGrad)" strokeWidth={3} opacity={0.6} filter="url(#glow)" fill="none" />
            )
          })}

          {/* Nodes */}
          {nodes.map((n, i) => {
            const isDone = completed.includes(n.id)
            const locked = i > 0 && !completed.includes(nodes[i-1].id)
            const r = 36
            const isNext = nextNode && nextNode.id === n.id
            const icon = n.type === 'video' ? <PlayCircle className="h-6 w-6 text-sky-300"/> : n.type === 'quiz' ? <HelpCircle className="h-6 w-6 text-amber-300"/> : <Target className="h-6 w-6 text-sky-300"/>
            return (
              <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                {/* pulsating ring for next suggested node */}
                {isNext && !isDone && !locked && (
                  <circle cx={r} cy={r} r={r+14} className="animate-ping" fill="rgba(56,189,248,0.25)" />
                )}
                <circle cx={r} cy={r} r={r} fill={isDone ? 'rgba(34,197,94,0.95)' : 'rgba(15,23,42,0.95)'} stroke={isDone ? 'rgba(34,197,94,1)' : 'rgba(148,163,184,0.6)'} strokeWidth={2} />
                <circle cx={r} cy={r} r={r+10} fill="none" stroke={locked ? 'rgba(100,116,139,0.4)' : 'rgba(56,189,248,0.5)'} strokeDasharray="6 6" />
                <foreignObject x={r-16} y={r-16} width="32" height="32"
                  onPointerEnter={(e) => setHover({ x: e.clientX - viewportRef.current.getBoundingClientRect().left, y: e.clientY - viewportRef.current.getBoundingClientRect().top, text: n.title })}
                  onPointerLeave={() => setHover(null)}
                >
                  <div className="w-8 h-8 flex items-center justify-center">
                    {locked ? <Lock className="h-5 w-5 text-slate-400"/> : isDone ? <CheckCircle2 className="h-6 w-6 text-white"/> : icon}
                  </div>
                </foreignObject>
                <text x={r} y={r*2+22} textAnchor="middle" className="fill-slate-200" style={{ fontSize: 12 }}>{n.title}</text>
                <g>
                  <rect x={r-42} y={r*2+30} rx={8} ry={8} width={84} height={28} fill={locked ? 'rgba(51,65,85,0.8)' : 'rgba(236,72,153,0.9)'} className="cursor-pointer" onClick={() => !locked && onSelect({ node: n, path, isDone, locked, completed, setCompleted })} />
                  <text x={r} y={r*2+48} textAnchor="middle" className="pointer-events-none fill-white" style={{ fontSize: 12 }}>{locked ? 'Locked' : isDone ? 'Open' : 'Open'}</text>
                </g>
              </g>
            )
          })}
        </svg>

        {/* Minimap */}
        <MiniMap
          world={world}
          vpSize={vpSize}
          zoom={zoom}
          offset={offset}
          nodes={nodes}
          onClickNode={(n) => centerOnNode(n)}
        />
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-500 inline-block"></span> Completed</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-slate-700 inline-block"></span> Not started</span>
        <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3"/> Locked until previous is complete</span>
        <span className="inline-flex items-center gap-1"><PlayCircle className="h-3 w-3"/> Video</span>
        <span className="inline-flex items-center gap-1"><HelpCircle className="h-3 w-3"/> Quiz</span>
      </div>
    </div>
  )
}

function MiniMap({ world, vpSize, zoom, offset, nodes, onClickNode }) {
  const W = 160
  const H = Math.max(80, Math.round((world.height / world.width) * W))
  const scale = W / world.width

  // Visible region in world space
  const vis = useMemo(() => {
    const vx = Math.max(0, -offset.x / zoom)
    const vy = Math.max(0, -offset.y / zoom)
    const vw = vpSize.w / zoom
    const vh = vpSize.h / zoom
    return { x: vx, y: vy, w: vw, h: vh }
  }, [offset.x, offset.y, zoom, vpSize.w, vpSize.h])

  return (
    <div className="absolute bottom-3 right-3 z-10">
      <div className="rounded-lg border border-white/10 bg-slate-900/80 backdrop-blur px-2 py-2 shadow-xl">
        <svg width={W} height={H} className="block">
          <rect x={0} y={0} width={W} height={H} fill="#0b1220" rx={8} />
          <rect x={0} y={0} width={W} height={H} fill="none" stroke="rgba(255,255,255,0.06)" />
          {/* node dots */}
          {nodes.map(n => (
            <circle key={`m-${n.id}`} cx={(n.x+40)*scale} cy={(n.y+40)*scale} r={3} fill="rgba(94,234,212,0.9)" onClick={() => onClickNode(n)} className="cursor-pointer" />
          ))}
          {/* viewport box */}
          <rect x={vis.x * scale} y={vis.y * scale} width={vis.w * scale} height={vis.h * scale} fill="rgba(59,130,246,0.08)" stroke="rgba(56,189,248,0.7)" />
        </svg>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="text-[10px] text-slate-400">Overview</div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">{Math.round(zoom*100)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailsSheet({ selected, userId, onClose }) {
  const { node, path, isDone, locked, setCompleted } = selected

  async function toggle() {
    const res = await fetch(`${API}/progress/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, path_title: path.title, node_id: node.id })
    })
    if (res.ok) {
      const data = await res.json()
      setCompleted(data.completed_node_ids)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[460px] bg-slate-900 border-l border-white/10 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">Goal</p>
            <h4 className="text-lg font-semibold text-white">{node.title}</h4>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800"><X className="h-5 w-5 text-slate-300"/></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto h-[calc(100%-64px)]">
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{node.content || node.summary}</div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-white/10">Difficulty: {node.difficulty || '—'}</span>
            <span className="px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-white/10">Order: {node.order}</span>
            {node.type && <span className="px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-white/10 capitalize">Type: {node.type}</span>}
          </div>
          <div className="pt-2 flex gap-2">
            <button
              disabled={locked}
              onClick={toggle}
              className={`flex-1 rounded-lg px-4 py-2 font-medium transition ${locked ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : isDone ? 'bg-green-500 hover:bg-green-400 text-white' : 'bg-pink-500 hover:bg-pink-400 text-white'}`}
            >{locked ? 'Locked' : isDone ? 'Mark as not done' : 'Mark complete'}</button>
            <a
              href="#"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-slate-200 hover:bg-slate-700"
              onClick={(e)=> e.preventDefault()}
            >
              <PlayCircle className="h-4 w-4"/> Open lesson
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function clamp(v, min, max){
  return Math.max(min, Math.min(max, v))
}
