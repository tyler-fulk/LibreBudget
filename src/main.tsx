import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { WalletProvider } from './hooks/useWallet'
import { ThemeProvider } from './hooks/useTheme'
import { ToastProvider } from './components/ui/Toast'
import { seedDatabase } from './db/seed'

seedDatabase()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <WalletProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </WalletProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
