import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { BioLogProvider } from './context/BioLogContext'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <BioLogProvider>
        <App />
      </BioLogProvider>
    </HashRouter>
  </React.StrictMode>
)
