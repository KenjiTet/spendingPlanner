import { useEffect, useState } from 'react'

// How long a step waits for its element to render before explaining it without pointing at anything
const WAIT_MS = 1500
const POLL_MS = 100

// An element hidden by the layout (display: none, a folded menu group) has no box to point at
function hasBox(element) {
  if (!element) {
    return false
  }

  const rect = element.getBoundingClientRect()

  return !!rect.width && !!rect.height
}

// Brings the element into sight, a tall one from its top so its beginning is the part shown
function scrollIntoSight(element) {
  const rect = element.getBoundingClientRect()

  if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
    return
  }

  let block = 'center'

  if (rect.height > window.innerHeight / 2) {
    block = 'start'
  }

  element.scrollIntoView({ block, behavior: 'smooth' })
}

/**
 * Follows the element a tour step points at: waits for it to render, scrolls it into sight, then tracks its box
 * @param {string} [selector] - undefined for a step pointing at nothing
 * @param {boolean} enabled - false while the page of the step is still opening
 * @returns {{ status: 'searching' | 'found' | 'none', rect?: DOMRect }}
 */
export default function useTourTarget(selector, enabled) {
  const [target, setTarget] = useState({ status: 'searching' })

  useEffect(() => {
    // The last box is kept while searching, so the spotlight glides from the previous element to the next
    setTarget((previous) => ({ ...previous, status: 'searching' }))

    if (!enabled) {
      return
    }

    if (!selector) {
      setTarget({ status: 'none' })
      return
    }

    const startedAt = Date.now()
    const resizeObserver = new ResizeObserver(track)
    let element = undefined
    let frame = undefined

    // Scrolling, resizing or content loading move the element: its box is read again once per frame
    function track() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setTarget({ status: 'found', rect: element.getBoundingClientRect() }))
    }

    function search() {
      const candidate = document.querySelector(selector)

      if (!hasBox(candidate)) {
        if (Date.now() - startedAt > WAIT_MS) {
          clearInterval(poll)
          setTarget({ status: 'none' })
        }

        return
      }

      clearInterval(poll)
      element = candidate
      scrollIntoSight(element)
      setTarget({ status: 'found', rect: element.getBoundingClientRect() })
      resizeObserver.observe(element)
      document.addEventListener('scroll', track, true)
      window.addEventListener('resize', track)
    }

    const poll = setInterval(search, POLL_MS)
    search()

    return () => {
      clearInterval(poll)
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      document.removeEventListener('scroll', track, true)
      window.removeEventListener('resize', track)
    }
  }, [selector, enabled])

  return target
}
