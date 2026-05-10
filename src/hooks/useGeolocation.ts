import { useState, useCallback } from 'react'

interface NominatimAddress {
  city?: string
  town?: string
  village?: string
  county?: string
}

interface NominatimResponse {
  address?: NominatimAddress
}

export function useGeolocation() {
  const [city, setCity] = useState<string | null>(null)

  const detectCity = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null)

      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
              { headers: { 'Accept-Language': 'en' } }
            )
            const data: NominatimResponse = await res.json()
            const detected =
              data.address?.city ??
              data.address?.town ??
              data.address?.village ??
              data.address?.county ??
              null
            setCity(detected)
            resolve(detected)
          } catch {
            resolve(null)
          }
        },
        () => resolve(null),
        { timeout: 5000, maximumAge: 60000 }
      )
    })
  }, [])

  return { city, detectCity }
}
