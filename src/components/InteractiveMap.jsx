import { useEffect, useMemo, useRef, useState } from 'react'
import { Target, Flag, ZoomIn, ZoomOut, X, CheckCircle2, Lock } from 'lucide-react'

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
    const spacing = 200
    const amplitude = 120
    const stepX = 180
    return ordered.map((n, i) => {
      const x = i * stepX
      const y = Math.sin(i / 1.5) * amplitude + (i % 2 === 0 ? 0 : 40)
      return { ...n, x, y }
    })
  }, [path.nodes])

  const viewBox = useMemo(() => {
    if (nodes.length === 0) return { width: 800, height: 400 }
    const minX = Math.min(...nodes.map(n => n.x))
    const maxX = Math.max(...nodes.map(n => n.x))
    const minY = Math.min(...nodes.map(n => n.y))
    const maxY = Math.max(...nodes.map(n => n.y))
    return { width: (maxX - minX) + 300, height: (maxY - minY) + 300 }
  }, [nodes])

  function onWheel(e) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(z => Math.max(0.5, Math.min(2.5, z + delta)))
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

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Flag className="text-pink-400" />
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-white">{path.title}</h3>
            <p className="text-slate-300 text-sm">{path.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.min(2.5, z + 0.2))} className="p-2 rounded-lg bg-slate-800 border border-white/10 hover:bg-slate-700"><ZoomIn className="h-4 w-4"/></button>
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-2 rounded-lg bg-slate-800 border border-white/10 hover:bg-slate-700"><ZoomOut className="h-4 w-4"/></button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <svg
          width={viewBox.width}
          height={viewBox.height}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
        >
          {/* Connections */}
          <defs>
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
          {nodes.map((n, i) => {
            if (i === 0) return null
            const prev = nodes[i-1]
            return (
              <line key={`line-${n.id}`} x1={prev.x+40} y1={prev.y+40} x2={n.x+40} y2={n.y+40} stroke="url(#lineGrad)" strokeWidth={3} opacity={0.6} filter="url(#glow)" />
            )
          })}

          {/* Nodes */}
          {nodes.map((n, i) => {
            const isDone = completed.includes(n.id)
            const locked = i > 0 && !completed.includes(nodes[i-1].id)
            const r = 36
            return (
              <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                <circle cx={r} cy={r} r={r} fill={isDone ? 'rgba(34,197,94,0.9)' : 'rgba(15,23,42,0.9)'} stroke={isDone ? 'rgba(34,197,94,1)' : 'rgba(148,163,184,0.6)'} strokeWidth={2} />
                <circle cx={r} cy={r} r={r+10} fill="none" stroke={locked ? 'rgba(100,116,139,0.4)' : 'rgba(56,189,248,0.5)'} strokeDasharray="6 6" />
                <foreignObject x={r-16} y={r-16} width="32" height="32">
                  <div className="w-8 h-8 flex items-center justify-center">
                    {locked ? <Lock className="h-5 w-5 text-slate-400"/> : isDone ? <CheckCircle2 className="h-6 w-6 text-white"/> : <Target className="h-6 w-6 text-sky-300"/>}
                  </div>
                </foreignObject>
                <text x={r} y={r*2+22} textAnchor="middle" className="fill-slate-200" style={{ fontSize: 12 }}>{n.title}</text>
                <g>
                  <rect x={r-36} y={r*2+30} rx={8} ry={8} width={72} height={28} fill={locked ? 'rgba(51,65,85,0.8)' : 'rgba(236,72,153,0.85)'} className="cursor-pointer" onClick={() => !locked && onSelect({ node: n, path, isDone, locked, completed, setCompleted })} />
                  <text x={r} y={r*2+48} textAnchor="middle" className="pointer-events-none fill-white" style={{ fontSize: 12 }}>{locked ? 'Locked' : 'Open'}</text>
                </g>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Quick actions */}
      <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-500 inline-block"></span> Completed</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-slate-700 inline-block"></span> Not started</span>
        <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3"/> Locked until previous is complete</span>
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
      <div className="absolute right-0 top-0 h-full w-full sm:w-[440px] bg-slate-900 border-l border-white/10 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">Goal</p>
            <h4 className="text-lg font-semibold text-white">{node.title}</h4>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800"><X className="h-5 w-5 text-slate-300"/></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto h-[calc(100%-64px)]">
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{node.content || node.summary}</div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-white/10">Difficulty: {node.difficulty || '—'}</span>
            <span className="px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-white/10">Order: {node.order}</span>
          </div>
          <div className="pt-2">
            <button
              disabled={locked}
              onClick={toggle}
              className={`w-full rounded-lg px-4 py-2 font-medium transition ${locked ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : isDone ? 'bg-green-500 hover:bg-green-400 text-white' : 'bg-pink-500 hover:bg-pink-400 text-white'}`}
            >{locked ? 'Locked' : isDone ? 'Mark as not done' : 'Mark complete'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
