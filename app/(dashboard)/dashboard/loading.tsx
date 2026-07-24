import Navbar from '@/app/components/Navbar'
import { SkeletonBox, SkeletonCircle } from '@/app/components/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="dashboard-root">
      <div className="stars" />
      <Navbar page="dashboard" showBack={false} />

      <div className="dashboard-content" style={{ maxWidth: 680, margin: '0 auto', padding: '48px 28px 80px', position: 'relative', zIndex: 1 }}>
        {/* Greeting */}
        <div style={{ marginBottom: 40 }}>
          <SkeletonBox width={90} height={10} style={{ marginBottom: 14 }} />
          <SkeletonBox width={260} height={34} style={{ marginBottom: 10 }} />
          <SkeletonBox width={200} height={13} />
        </div>

        {/* Birth details card */}
        <div style={{ padding: '18px 22px', marginBottom: 32, borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <SkeletonBox width={90} height={10} style={{ marginBottom: 18 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <SkeletonCircle size={12} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <SkeletonBox width="40%" height={9} />
                  <SkeletonBox width="70%" height={12} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <SkeletonBox width={90} height={10} style={{ marginBottom: 14 }} />

        {/* Featured card */}
        <div className="card" style={{ padding: '20px 22px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
          <SkeletonCircle size={48} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonBox width="45%" height={14} />
            <SkeletonBox width="75%" height={11} />
          </div>
        </div>

        {/* Grid cards */}
        <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <SkeletonCircle size={44} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <SkeletonBox width="60%" height={12} />
                <SkeletonBox width="85%" height={10} />
              </div>
            </div>
          ))}
        </div>

        <style>{`
          @media (max-width: 480px) {
            .dashboard-content { padding: 32px 20px 72px !important; }
            .cards-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </div>
  )
}
