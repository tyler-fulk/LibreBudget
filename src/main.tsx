import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { WalletProvider } from './hooks/useWallet'
import { ThemeProvider } from './hooks/useTheme'
import { EncryptionIndicatorsProvider } from './hooks/useShowEncryptionIndicators'
import { ToastProvider } from './components/ui/Toast'
import { seedDatabase } from './db/seed'

seedDatabase()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <WalletProvider>
          <EncryptionIndicatorsProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </EncryptionIndicatorsProvider>
        </WalletProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
