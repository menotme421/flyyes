import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// WHY: Carbon reset first, then shell styles.
// FUTURE: carbon-theme — both imports become the shared package.
import './carbon.scss'
import './app.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
