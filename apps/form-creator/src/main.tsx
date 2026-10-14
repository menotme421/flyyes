import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// WHY: Brand tokens + Tailwind come from the shared package; page content
// uses utilities inline (no app stylesheet).
import '@flyyes/ui/styles/globals.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
