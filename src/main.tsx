import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import { hydrateContent } from './portfolio/bootstrap'

// Fire-and-forget: seed the LCD cache from Supabase (or the local catalog if
// Supabase is unconfigured/unreachable) before the first paint. Non-blocking.
void hydrateContent()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)