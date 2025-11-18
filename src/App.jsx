import Hero from './components/Hero'
import PathMap from './components/PathMap'
import HowItWorks from './components/HowItWorks'
import InteractiveMap from './components/InteractiveMap'

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Hero />
      {/* Interactive goals map */}
      <div className="mx-auto max-w-6xl px-6 pt-10">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Interactive Map</h2>
        <p className="text-slate-300 mb-4">Zoom, drag, and open each goal to read and mark progress.</p>
      </div>
      <InteractiveMap />

      {/* List view below as an alternative accessibility-friendly layout */}
      <div className="mx-auto max-w-6xl px-6 pt-6">
        <h3 className="text-xl font-semibold text-white mb-2">List View</h3>
        <p className="text-slate-400 mb-4">Prefer a linear view? Use the list below to read lessons and toggle completion.</p>
      </div>
      <PathMap />

      <HowItWorks />
      <footer className="py-10 text-center text-slate-400 text-sm">Made with curiosity • Learn by exploring</footer>
    </div>
  )
}

export default App
