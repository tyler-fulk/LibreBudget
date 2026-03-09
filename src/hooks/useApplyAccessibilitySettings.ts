import { useEffect } from 'react'
import { useSettings } from './useSettings'

/** Applies accessibility settings to the document. */
export function useApplyAccessibilitySettings() {
  const { reducedMotion, strongFocusIndicators, fontScale } = useSettings()

  useEffect(() => {
    const root = document.documentElement
    if (reducedMotion) {
      root.classList.add('reduced-motion')
    } else {
      root.classList.remove('reduced-motion')
    }
    if (strongFocusIndicators) {
      root.classList.add('strong-focus')
    } else {
      root.classList.remove('strong-focus')
    }
    root.classList.remove('font-scale-large', 'font-scale-xlarge')
    if (fontScale === 'large') root.classList.add('font-scale-large')
    else if (fontScale === 'xlarge') root.classList.add('font-scale-xlarge')

    return () => {
      root.classList.remove('reduced-motion', 'strong-focus', 'font-scale-large', 'font-scale-xlarge')
    }
  }, [reducedMotion, strongFocusIndicators, fontScale])
}
