// app/components/Skeleton.tsx
//
// Building blocks for route-level loading.tsx skeletons. Plain server
// components (pure CSS shimmer, zero client JS) so they paint the instant
// Next.js swaps into a new route segment — before any data fetch even
// starts. Shapes are kept loosely matched to each real page's layout so
// the swap from skeleton -> real content doesn't jump around.

export function SkeletonBox({
  width = '100%',
  height = 14,
  radius = 6,
  style,
}: {
  width?: string | number
  height?: string | number
  radius?: number
  style?: React.CSSProperties
}) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  )
}

export function SkeletonCircle({ size = 44, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <div
      className="skeleton"
      style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, ...style }}
    />
  )
}

export function SkeletonCard({
  children,
  padding = '20px 22px',
  style,
}: {
  children: React.ReactNode
  padding?: string
  style?: React.CSSProperties
}) {
  return (
    <div className="card" style={{ padding, ...style }}>
      {children}
    </div>
  )
}

/** A row of icon + two stacked text lines — the most common card pattern in the app. */
export function SkeletonIconRow({ iconSize = 20 }: { iconSize?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <SkeletonCircle size={iconSize + 24} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SkeletonBox width="55%" height={13} />
        <SkeletonBox width="80%" height={11} />
      </div>
    </div>
  )
}

/** Page kicker + heading + subtext — the header pattern shared by every inner page. */
export function SkeletonHeader({ kickerWidth = 90, headingWidth = 220 }: { kickerWidth?: number; headingWidth?: number }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <SkeletonBox width={kickerWidth} height={10} style={{ marginBottom: 14 }} />
      <SkeletonBox width={headingWidth} height={32} style={{ marginBottom: 10 }} />
      <SkeletonBox width={Math.min(headingWidth + 120, 340)} height={13} />
    </div>
  )
}
