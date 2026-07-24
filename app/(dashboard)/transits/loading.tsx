import Navbar from '@/app/components/Navbar'
import { SkeletonBox, SkeletonCircle, SkeletonHeader } from '@/app/components/Skeleton'

export default function TransitsLoading() {
  return (
    <div className="relative min-h-screen">
      <div className="stars" />
      <Navbar page="transits" showBack />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '44px 24px 80px', position: 'relative', zIndex: 1 }}>
        <SkeletonHeader kickerWidth={80} headingWidth={190} />

        <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 50px 1fr', padding: '9px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <SkeletonBox width={50} height={9} />
            <SkeletonBox width={50} height={9} />
            <SkeletonBox width={30} height={9} />
            <SkeletonBox width={50} height={9} />
          </div>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 50px 1fr', alignItems: 'center', padding: '12px 16px', borderBottom: i < 8 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SkeletonCircle size={18} />
                <SkeletonBox width={60} height={11} />
              </div>
              <SkeletonBox width={70} height={11} />
              <SkeletonBox width={26} height={11} />
              <SkeletonBox width={70} height={11} />
            </div>
          ))}
        </div>

        <SkeletonBox width={130} height={10} style={{ marginBottom: 14 }} />
        <div className="card" style={{ padding: '18px 20px' }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: i < 1 ? '1px solid var(--border)' : 'none' }}>
              <SkeletonBox width="90%" height={12} style={{ marginBottom: 6 }} />
              <SkeletonBox width="60%" height={10} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
