import Navbar from '@/app/components/Navbar'
import { SkeletonBox, SkeletonCircle, SkeletonHeader } from '@/app/components/Skeleton'

function HorizontalCardSkeleton() {
  return (
    <div className="card" style={{ padding: '18px 20px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
      <SkeletonCircle size={40} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SkeletonBox width="35%" height={10} />
        <SkeletonBox width="55%" height={16} />
        <SkeletonBox width="70%" height={10} />
      </div>
    </div>
  )
}

function MiniCardSkeleton() {
  return (
    <div className="card" style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      <SkeletonCircle size={28} />
      <SkeletonBox width="80%" height={12} />
      <SkeletonBox width="60%" height={9} />
    </div>
  )
}

export default function PanchangLoading() {
  return (
    <div className="relative min-h-screen">
      <div className="stars" />
      <Navbar page="panchang" showBack />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>
        <SkeletonHeader kickerWidth={80} headingWidth={200} />

        <HorizontalCardSkeleton />
        <HorizontalCardSkeleton />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
          <MiniCardSkeleton />
          <MiniCardSkeleton />
          <MiniCardSkeleton />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          <MiniCardSkeleton />
          <MiniCardSkeleton />
        </div>

        <SkeletonBox width={120} height={10} style={{ marginBottom: 14 }} />
        <div className="card" style={{ padding: '18px 20px' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <SkeletonBox width={100} height={12} />
              <SkeletonBox width={70} height={12} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
