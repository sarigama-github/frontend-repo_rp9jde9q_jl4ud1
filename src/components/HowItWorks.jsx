export default function HowItWorks(){
  const steps = [
    { title: 'Pick a path', desc: 'Choose a themed learning journey that looks fun.' },
    { title: 'Follow the map', desc: 'Each stop is a tiny lesson wrapped in story.' },
    { title: 'Unlock by doing', desc: 'Mark steps complete to reveal the next challenge.' },
  ]
  return (
    <section id="how" className="py-12">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">How it works</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {steps.map((s) => (
            <div key={s.title} className="rounded-2xl border border-white/10 bg-slate-800/60 p-5">
              <h3 className="text-white font-semibold">{s.title}</h3>
              <p className="text-slate-300 text-sm mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
