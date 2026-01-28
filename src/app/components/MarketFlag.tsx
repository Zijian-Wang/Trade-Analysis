type MarketFlagProps = {
  market: 'US' | 'CN'
  className?: string
  title?: string
}

/**
 * Cross-platform market flag icon.
 *
 * We intentionally avoid emoji flags here because Windows Chrome can render the
 * underlying regional-indicator letters (e.g. "US") instead of a flag glyph.
 */
export function MarketFlag({ market, className, title }: MarketFlagProps) {
  const computedTitle =
    title ?? (market === 'US' ? 'United States' : 'China')

  if (market === 'US') {
    return (
      <svg
        viewBox="0 0 24 16"
        className={className}
        role="img"
        aria-label={computedTitle}
        focusable="false"
      >
        <title>{computedTitle}</title>
        {/* Background */}
        <rect width="24" height="16" fill="#fff" />
        {/* Red stripes (simplified) */}
        <rect x="0" y="0" width="24" height="2" fill="#B22234" />
        <rect x="0" y="4" width="24" height="2" fill="#B22234" />
        <rect x="0" y="8" width="24" height="2" fill="#B22234" />
        <rect x="0" y="12" width="24" height="2" fill="#B22234" />
        {/* Canton */}
        <rect x="0" y="0" width="10.5" height="7.5" fill="#3C3B6E" />
      </svg>
    )
  }

  // CN
  return (
    <svg
      viewBox="0 0 24 16"
      className={className}
      role="img"
      aria-label={computedTitle}
      focusable="false"
    >
      <title>{computedTitle}</title>
      <rect width="24" height="16" fill="#DE2910" />
      {/* Simplified main star */}
      <polygon
        fill="#FFDE00"
        points="5.2,2.2 6.1,4.3 8.4,4.4 6.6,5.8 7.2,8 5.2,6.8 3.2,8 3.8,5.8 2,4.4 4.3,4.3"
      />
    </svg>
  )
}

