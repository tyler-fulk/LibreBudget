import { useState } from 'react'

export type HomeHousingType = 'owning' | 'renting'

export function useHomeHousingType() {
  const [housingType, setHousingType] = useState<HomeHousingType>('owning')
  return { housingType, setHousingType }
}
