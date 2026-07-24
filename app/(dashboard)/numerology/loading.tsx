import Navbar from '@/app/components/Navbar'
import { SkeletonBox, SkeletonCircle, SkeletonHeader } from '@/app/components/Skeleton'

function NumberCardSkeleton() {
  return (
    <div className="card" style={{ padding: '20px 18px' }}>
      <SkeletonBox width={80} height={9} style={{ marginBottom: 16 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <SkeletonCircle size={56} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SkeletonBox width="70%" height={14} />
          <SkeletonBox width="50%" height={11} />
        </div>
      </div>
      <SkeletonBox width="100%" height={11} style={{ marginBottom: 6 }} />
      <SkeletonBox width="80%" height={11} style={{ marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <SkeletonBox width={50} height={18} radius={100} />
        <SkeletonBox width={60} height={18} radius={100} />
      </div>
    </div>
  )
}

export default function NumerologyLoading() {
  return (
    <div className="relative min-h-screen">
      <div className="stars" />
      <Navbar page="numerology" showBack />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>
        <SkeletonHeader kickerWidth={80} headingWidth={200} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <NumberCardSkeleton />
          <NumberCardSkeleton />
        </div>

        <SkeletonBox width={110} height={10} style={{ marginBottom: 12 }} />
        <div className="card" style={{ padding: '24px 22px', marginBottom: 28 }}>
          <SkeletonBox width="100%" height={12} style={{ marginBottom: 10 }} />
          <SkeletonBox width="100%" height={12} style={{ marginBottom: 10 }} />
          <SkeletonBox width="70%" height={12} />
        </div>

        <div style={{ padding: '20px 24px', borderRadius: 16, background: 'var(--orange-glow)', border: '1px solid var(--orange-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonBox width="45%" height={13} />
            <SkeletonBox width="70%" height={11} />
          </div>
        </div>
      </div>
    </div>
  )
}
