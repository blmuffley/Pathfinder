import { useState } from 'react'
import PathfinderWorkspace from './PathfinderWorkspace'
import PitchDeck from './PitchDeck'

function App() {
  const [mode, setMode] = useState(() => {
    return window.location.hash === '#pitch' ? 'pitch' : 'workspace'
  })

  return (
    <div>
      {/* Mode switcher — top right corner */}
      <div style={{ position: 'fixed', top: 8, right: 12, zIndex: 9999, display: 'flex', gap: 2, background: '#151525', borderRadius: 6, padding: 2 }}>
        <button onClick={() => { setMode('workspace'); window.location.hash = ''; }} style={{
          padding: '4px 12px', borderRadius: 4, border: 'none', fontSize: 10, cursor: 'pointer',
          fontWeight: mode === 'workspace' ? 600 : 400,
          color: mode === 'workspace' ? '#0E0E0C' : '#6a6a84',
          background: mode === 'workspace' ? '#c8ff00' : 'transparent',
        }}>Workspace</button>
        <button onClick={() => { setMode('pitch'); window.location.hash = 'pitch'; }} style={{
          padding: '4px 12px', borderRadius: 4, border: 'none', fontSize: 10, cursor: 'pointer',
          fontWeight: mode === 'pitch' ? 600 : 400,
          color: mode === 'pitch' ? '#0E0E0C' : '#6a6a84',
          background: mode === 'pitch' ? '#c8ff00' : 'transparent',
        }}>Pitch Deck</button>
      </div>
      {mode === 'workspace' ? <PathfinderWorkspace /> : <PitchDeck />}
    </div>
  )
}

export default App
