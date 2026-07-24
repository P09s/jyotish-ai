import Navbar from '@/app/components/Navbar'
import { SkeletonBox, SkeletonCircle, SkeletonHeader } from '@/app/components/Skeleton'

function BalaCardSkeleton() {
  return (
    <div className="card" style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <SkeletonCircle size={30} />
      <SkeletonBox width="70%" height={11} />
      <SkeletonBox width="50%" height={9} />
    </div>
  )
}

export default function ShubhAshubhLoading() {
  return (
    <div className="relative min-h-screen">
      <div className="stars" />
      <Navbar page="shubh-ashubh" showBack />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>
        <SkeletonHeader kickerWidth={80} headingWidth={200} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <BalaCardSkeleton />
          <BalaCardSkeleton />
        </div>

        <div className="card" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 24 }}>
          <SkeletonBox width={100} height={11} />
          <SkeletonBox width={100} height={11} />
        </div>

        <SkeletonBox width={110} height={10} style={{ marginBottom: 12 }} />
        <div className="card" style={{ padding: '24px 22px' }}>
          <SkeletonBox width="100%" height={12} style={{ marginBottom: 10 }} />
          <SkeletonBox width="100%" height={12} style={{ marginBottom: 10 }} />
          <SkeletonBox width="55%" height={12} />
        </div>
      </div>
    </div>
  )
}
