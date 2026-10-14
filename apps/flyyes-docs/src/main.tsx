import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// WHY: Style order matters — ui globals (Tailwind v4 + brand tokens) first,
// then index.css (app-only: shell offset, TipTap, print), then flyyes.scss.
import '@flyyes/ui/styles/globals.css'
import './index.css'
import './styles/flyyes.scss'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
