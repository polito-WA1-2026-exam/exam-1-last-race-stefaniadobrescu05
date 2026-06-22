function CoinAmount({ children, className = '' }) {
  return (
    <span className={`coin-amount ${className}`.trim()}>
      <span aria-hidden="true">🪙</span>
      <span>{children}</span>
    </span>
  )
}

export default CoinAmount
