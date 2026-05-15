import { useEffect, useState } from "react"

function getMatches(query: string) {
  return typeof window !== "undefined" && window.matchMedia(query).matches
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => getMatches(query))

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const handleChange = () => setMatches(mediaQuery.matches)

    handleChange()
    mediaQuery.addEventListener("change", handleChange)

    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [query])

  return matches
}
