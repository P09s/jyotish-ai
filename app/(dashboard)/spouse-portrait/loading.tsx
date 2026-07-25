import Navbar from '@/app/components/Navbar'
import { SkeletonBox, SkeletonCircle, SkeletonHeader } from '@/app/components/Skeleton'

export default function SpousePortraitLoading() {
  return (
    <div className="relative min-h-screen">
      <div className="stars" />
      <Navbar page="spouse-portrait" showBack />

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>
        <SkeletonHeader kickerWidth={80} headingWidth={220} />

        <div className="card" style={{ padding: '40px 28px', textAlign: 'center', marginTop: 32 }}>
          <SkeletonCircle size={56} style={{ margin: '0 auto 18px' }} />
          <SkeletonBox width="90%" height={12} style={{ margin: '0 auto 8px' }} />
          <SkeletonBox width="70%" height={12} style={{ margin: '0 auto 24px' }} />
          <SkeletonBox width={200} height={40} radius={10} style={{ margin: '0 auto' }} />
        </div>
      </div>
    </div>
  )
}