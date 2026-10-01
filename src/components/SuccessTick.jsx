/**
 * Green tick drawn in a disc, celebrating a step completed; decorative, the text around it carries the meaning
 */
export default function SuccessTick() {
  return (
    <svg className="success-tick" viewBox="0 0 64 64" aria-hidden="true">
      <circle className="success-tick__disc" cx="32" cy="32" r="30" />
      <path className="success-tick__mark" d="M19 33 l9 9 l17 -19" />
    </svg>
  )
}
