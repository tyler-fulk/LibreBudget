import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

const STORAGE_KEY = 'lb-show-encryption-indicators'

interface EncryptionIndicatorsContextValue {
  show: boolean
  toggle: () => void
}

const Context = createContext<EncryptionIndicatorsContextValue>({
  show: false,
  toggle: () => {},
})

export function useShowEncryptionIndicators() {
  return useContext(Context)
}

export function EncryptionIndicatorsProvider({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'true'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(show))
  }, [show])

  const toggle = () => setShow((s) => !s)

  return (
    <Context.Provider value={{ show, toggle }}>
      {children}
    </Context.Provider>
  )
}
