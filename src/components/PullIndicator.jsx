// Spins on its own while refreshing, follows the finger otherwise
function pullClassOf(refreshing) {
  if (refreshing) {
    return 'pull pull--refreshing'
  }

  return 'pull'
}

/**
 * Spinner sliding down from the top of the screen during a pull-to-refresh
 * @param {object} props
 * @param {import('react').RefObject<HTMLElement>} props.indicatorRef - from usePullToRefresh
 * @param {boolean} props.refreshing
 */
export default function PullIndicator({ indicatorRef, refreshing }) {
  return (
    <p ref={indicatorRef} className={pullClassOf(refreshing)} role="status">
      <span className="pull__spinner" aria-hidden="true" />
      {refreshing && <span className="visually-hidden">Actualisation…</span>}
    </p>
  )
}
