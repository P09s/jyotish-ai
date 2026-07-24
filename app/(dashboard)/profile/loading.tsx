import Navbar from '@/app/components/Navbar'
import { SkeletonBox, SkeletonHeader } from '@/app/components/Skeleton'

function FieldSkeleton({ label = 70, width = '100%' }: { label?: number; width?: string }) {
  return (
    <div style={{ width }}>
      <SkeletonBox width={label} height={9} style={{ marginBottom: 8 }} />
      <SkeletonBox width="100%" height={44} radius={10} />
    </div>
  )
}

export default function ProfileLoading() {
  return (
    <div className="relative min-h-screen">
      <div className="stars" />
      <Navbar page="profile" showBack />

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>
        <SkeletonHeader kickerWidth={70} headingWidth={200} />

        {/* Personal */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <SkeletonBox width={70} height={10} style={{ marginBottom: 20 }} />
          <div style={{ marginBottom: 20 }}>
            <FieldSkeleton label={80} />
          </div>
          <FieldSkeleton label={90} />
        </div>

        {/* Birth details */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <SkeletonBox width={100} height={10} style={{ marginBottom: 20 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <FieldSkeleton label={90} />
            <FieldSkeleton label={50} />
          </div>
          <FieldSkeleton label={90} />
        </div>

        <SkeletonBox width="100%" height={46} radius={10} />
      </div>
    </div>
  )
}
