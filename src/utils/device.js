// Device detection, to recommend the home-screen app to phone visitors still in the browser

/** iPhone and iPad, the latter announcing itself as a Mac with a touch screen since iPadOS 13 */
export function isIOS() {
  const userAgent = window.navigator.userAgent

  return /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/.test(userAgent) && window.navigator.maxTouchPoints > 1)
}

/** Phone or tablet, whatever the browser */
export function isMobile() {
  return isIOS() || /Android/i.test(window.navigator.userAgent)
}

/** Opened from the home screen, without the browser bars (navigator.standalone is the older iOS flag) */
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone
}
