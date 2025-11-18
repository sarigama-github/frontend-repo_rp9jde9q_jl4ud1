import Spline from '@splinetool/react-spline'

export default function Hero() {
  return (
    <section className="relative h-[70vh] w-full overflow-hidden">
      <div className="absolute inset-0">
        <Spline scene="https://prod.spline.design/atN3lqky4IzF-KEP/scene.splinecode" style={{ width: '100%', height: '100%' }} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/30 to-slate-950"></div>
      </div>

      <div className="relative z-10 h-full flex items-center">
        <div className="mx-auto max-w-5xl px-6 w-full">
          <div className="backdrop-blur-sm bg-slate-900/40 border border-white/10 rounded-2xl p-6 md:p-8 w-full md:w-[70%]">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow">Story Realms</h1>
            <p className="mt-3 md:mt-4 text-slate-200/90 text-sm md:text-base">A playful, interactive learning world. Follow a map of quests, unlock chapters, and learn by exploring.</p>
            <div className="mt-5 flex gap-3">
              <a href="#map" className="inline-flex items-center rounded-lg bg-pink-500 hover:bg-pink-400 text-white px-4 py-2 text-sm font-semibold transition">Start Exploring</a>
              <a href="#how" className="inline-flex items-center rounded-lg bg-slate-800/70 hover:bg-slate-700 text-white px-4 py-2 text-sm font-semibold transition">How it works</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
