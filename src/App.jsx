import Hero from './components/Hero'
import PathMap from './components/PathMap'
import HowItWorks from './components/HowItWorks'

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Hero />
      <PathMap />
      <HowItWorks />
      <footer className="py-10 text-center text-slate-400 text-sm">Made with curiosity • Learn by exploring</footer>
    </div>
  )
}

export default App
