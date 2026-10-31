import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Self-hosted Arabic fonts (bundled — no external requests, works offline)
import '@fontsource/alexandria/700.css'
import '@fontsource/alexandria/800.css'
import '@fontsource/alexandria/900.css'
import '@fontsource/readex-pro/400.css'
import '@fontsource/readex-pro/500.css'
import '@fontsource/readex-pro/600.css'
import '@fontsource/readex-pro/700.css'

import './styles/tokens.css'
import './styles/base.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
