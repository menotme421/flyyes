import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// WHY: Style order matters — carbon.scss (Carbon reset) first, then index.css
// tokens/utilities, then flyyes.scss layout. FUTURE: carbon-theme — first and
// third imports become the shared package; index.css TipTap/print rules stay.
import './carbon.scss'
import './index.css'
import './styles/flyyes.scss'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
