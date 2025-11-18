import { useEffect, useMemo, useState } from 'react'
import { MapPin, BookOpenCheck, Lock } from 'lucide-react'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default function PathMap() {
  const [paths, setPaths] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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

  if (loading) return <div className="py-16 text-center text-slate-300">Loading map...</div>
  if (error) return (
    <div className="py-16 text-center">
      <p className="text-slate-300 mb-4">{error}</p>
      <a href={`${API}/bootstrap`} target="_blank" className="text-pink-400 underline">Click here to bootstrap sample content</a>
    </div>
  )

  return (
    <section id="map" className="relative py-12">
      <div className="mx-auto max-w-5xl px-6">
        {paths.map((p) => (
          <PathCard key={p.title} path={p} userId={userId} />
        ))}
      </div>
    </section>
  )
}

function PathCard({ path, userId }) {
  const [completed, setCompleted] = useState([])

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

  const orderedNodes = useMemo(() => [...path.nodes].sort((a,b) => a.order - b.order), [path.nodes])

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
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <MapPin className="text-pink-400" />
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-white">{path.title}</h3>
          <p className="text-slate-300 text-sm">{path.description}</p>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-4 md:left-6 top-0 bottom-0 w-px bg-slate-700/60" />
        <ul className="space-y-4">
          {orderedNodes.map((n, idx) => {
            const isDone = completed.includes(n.id)
            const locked = idx > 0 && !completed.includes(orderedNodes[idx-1].id)
            return (
              <li key={n.id} className="relative pl-10 md:pl-14">
                <span className={`absolute left-0 top-1.5 h-3 w-3 rounded-full ${isDone ? 'bg-green-400' : 'bg-slate-500'}`}></span>
                <div className="flex items-start gap-3 bg-slate-800/60 border border-white/10 rounded-xl p-4">
                  <div className="mt-0.5">
                    {locked ? <Lock className="h-5 w-5 text-slate-400"/> : <BookOpenCheck className={`h-5 w-5 ${isDone ? 'text-green-400' : 'text-slate-300'}`} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-white font-semibold">{n.title}</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-200">{n.difficulty || '—'}</span>
                    </div>
                    <p className="text-slate-300 text-sm">{n.summary}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        disabled={locked}
                        onClick={() => toggle(n.id)}
                        className={`text-xs rounded-lg px-3 py-1 font-medium transition ${locked ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : isDone ? 'bg-green-500/90 hover:bg-green-500 text-white' : 'bg-pink-500/90 hover:bg-pink-400 text-white'}`}
                      >{isDone ? 'Mark as not done' : 'Mark complete'}</button>
                      <details className="group">
                        <summary className="cursor-pointer list-none text-xs text-sky-300">Read lesson</summary>
                        <p className="mt-2 text-slate-200/90 text-sm leading-relaxed">{n.content}</p>
                      </details>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
