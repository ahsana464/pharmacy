import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PharmacyDashboard from './PharmacyDashboard.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PharmacyDashboard />
  </StrictMode>,
)
