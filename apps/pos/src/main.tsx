import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './mock-electron' // Browser fallback
import App from './App.tsx'

import { ConfigProvider } from './providers/ConfigProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider>
      <App />
    </ConfigProvider>
  </StrictMode>,
)
