import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerAppWebMCPTools } from './webmcp/registerTools'

// Register native WebMCP tools and window.__WEBMCP_TOOLS__ fallback at startup
registerAppWebMCPTools().catch((err) => {
  console.warn('WebMCP registration warning:', err);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
