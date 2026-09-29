import { useEffect, useRef, useState } from 'react'

// Distance the indicator must travel before a release refreshes, and the most it follows the finger
const THRESHOLD_PX = 64
const MAX_PULL_PX = 96
// The indicator moves slower than the finger, like the native gesture
const RESISTANCE = 0.5

/**
 * Pull-to-refresh on touch screens: dragging down from the very top of the page, then releasing past the threshold,
 * runs onRefresh. The distance, in pixels, is written as `--pull` on the indicator, so following the finger never re-renders
 * @param {() => Promise<unknown>} onRefresh
 * @returns {{ indicatorRef: import('react').RefObject<HTMLElement>, refreshing: boolean }}
 */
export default function usePullToRefresh(onRefresh) {
  const indicatorRef = useRef(undefined)
  const [refreshing, setRefreshing] = useState(false)
  // The listeners are bound once, so they read the latest callback and state through refs
  const refreshRef = useRef(onRefresh)
  const busy = useRef(false)

  refreshRef.current = onRefresh

  useEffect(() => {
    let startX = 0
    let startY = undefined
    let pull = 0

    const setPull = (distance) => {
      pull = distance
      indicatorRef.current?.style.setProperty('--pull', String(distance))
    }

    // A gesture only starts at the top of the page, and never inside an open sheet
    const start = (event) => {
      startY = undefined

      if (busy.current || window.scrollY > 0 || !!event.target.closest('dialog')) {
        return
      }

      startX = event.touches[0].clientX
      startY = event.touches[0].clientY
    }

    const move = (event) => {
      if (startY === undefined) {
        return
      }

      const distance = event.touches[0].clientY - startY
      const sideways = Math.abs(event.touches[0].clientX - startX)

      // Scrolling back up, or swiping sideways through a chart, hands the page over to the normal scroll
      if (distance <= 0 || (pull === 0 && sideways > distance)) {
        setPull(0)
        return
      }

      // Holds the page still, instead of the browser's own bounce or refresh
      if (event.cancelable) {
        event.preventDefault()
      }

      setPull(Math.min(distance * RESISTANCE, MAX_PULL_PX))
    }

    const end = async () => {
      const released = pull

      startY = undefined
      setPull(0)

      if (released < THRESHOLD_PX) {
        return
      }

      busy.current = true
      setRefreshing(true)

      try {
        await refreshRef.current()
      } finally {
        busy.current = false
        setRefreshing(false)
      }
    }

    window.addEventListener('touchstart', start, { passive: true })
    window.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend', end)
    window.addEventListener('touchcancel', end)

    return () => {
      window.removeEventListener('touchstart', start)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
      window.removeEventListener('touchcancel', end)
    }
  }, [])

  return { indicatorRef, refreshing }
}
