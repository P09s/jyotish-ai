import Navbar from '@/app/components/Navbar'
import { SkeletonBox, SkeletonHeader, SkeletonIconRow } from '@/app/components/Skeleton'

export default function KundaliLoading() {
  return (
    <div className="relative min-h-screen">
      <div className="stars" />
      <Navbar page="kundali" showBack />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>
        <SkeletonHeader kickerWidth={70} headingWidth={180} />

        {/* Chart placeholder */}
        <div className="card" style={{ padding: 20, marginBottom: 28, display: 'flex', justifyContent: 'center' }}>
          <SkeletonBox width="100%" height={0} style={{ paddingBottom: '80%', maxWidth: 480, borderRadius: 12 }} />
        </div>

        {/* Planetary positions list */}
        <SkeletonBox width={140} height={10} style={{ marginBottom: 16 }} />
        <div className="card" style={{ padding: '8px 20px' }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ padding: '14px 0', borderBottom: i < 8 ? '1px solid var(--border)' : 'none' }}>
              <SkeletonIconRow iconSize={16} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
