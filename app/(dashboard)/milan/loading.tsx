import Navbar from '@/app/components/Navbar'
import { SkeletonBox, SkeletonHeader } from '@/app/components/Skeleton'

function FieldSkeleton({ width = '100%' }: { width?: string }) {
  return (
    <div style={{ width, marginBottom: 16 }}>
      <SkeletonBox width={90} height={10} style={{ marginBottom: 8 }} />
      <SkeletonBox width="100%" height={42} radius={10} />
    </div>
  )
}

export default function MilanLoading() {
  return (
    <div className="relative min-h-screen">
      <div className="stars" />
      <Navbar page="milan" showBack />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>
        <SkeletonHeader kickerWidth={70} headingWidth={220} />

        {/* Your chart summary strip */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 20 }}>
          <SkeletonBox width={80} height={11} />
          <SkeletonBox width={80} height={11} />
          <SkeletonBox width={80} height={11} />
        </div>

        {/* Partner form */}
        <SkeletonBox width={130} height={10} style={{ marginBottom: 16 }} />
        <div className="card" style={{ padding: '22px' }}>
          <FieldSkeleton />
          <div style={{ display: 'flex', gap: 12 }}>
            <FieldSkeleton width="50%" />
            <FieldSkeleton width="50%" />
          </div>
          <FieldSkeleton />
          <SkeletonBox width="100%" height={46} radius={10} style={{ marginTop: 4 }} />
        </div>
      </div>
    </div>
  )
}
