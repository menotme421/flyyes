import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './carbon.scss'
import './index.css'
import './styles/flyyes.scss'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
