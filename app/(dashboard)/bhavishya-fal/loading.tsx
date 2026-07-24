import Navbar from '@/app/components/Navbar'
import { SkeletonBox, SkeletonCircle, SkeletonHeader } from '@/app/components/Skeleton'

function AreaCardSkeleton() {
  return (
    <div className="card" style={{ padding: '18px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <SkeletonCircle size={30} />
        <SkeletonBox width="50%" height={12} />
      </div>
      <SkeletonBox width="100%" height={10} style={{ marginBottom: 6 }} />
      <SkeletonBox width="65%" height={10} />
    </div>
  )
}

export default function BhavishyaFalLoading() {
  return (
    <div className="relative min-h-screen">
      <div className="stars" />
      <Navbar page="bhavishya-fal" showBack />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>
        <SkeletonHeader kickerWidth={80} headingWidth={200} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          <AreaCardSkeleton />
          <AreaCardSkeleton />
          <AreaCardSkeleton />
          <AreaCardSkeleton />
        </div>

        <SkeletonBox width={110} height={10} style={{ marginBottom: 12 }} />
        <div className="card" style={{ padding: '24px 22px' }}>
          <SkeletonBox width="100%" height={12} style={{ marginBottom: 10 }} />
          <SkeletonBox width="100%" height={12} style={{ marginBottom: 10 }} />
          <SkeletonBox width="60%" height={12} />
        </div>
      </div>
    </div>
  )
}
