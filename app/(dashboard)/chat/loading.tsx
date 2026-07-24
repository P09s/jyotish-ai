import Navbar from '@/app/components/Navbar'
import { SkeletonBox, SkeletonCircle } from '@/app/components/Skeleton'

export default function ChatLoading() {
  return (
    <div className="relative" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="stars" />
      <Navbar page="chat" showBack />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 24px' }}>
          <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 20px' }}>
            <div style={{ textAlign: 'center', paddingTop: 32, paddingBottom: 32 }}>
              <SkeletonCircle size={56} style={{ margin: '0 auto 20px' }} />
              <SkeletonBox width={200} height={22} style={{ margin: '0 auto 14px' }} />
              <SkeletonBox width={280} height={12} style={{ margin: '0 auto 6px' }} />
              <SkeletonBox width={220} height={12} style={{ margin: '0 auto 32px' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 440, margin: '0 auto' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonBox key={i} width="100%" height={42} radius={12} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div style={{ flexShrink: 0, padding: '10px 20px 18px' }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <SkeletonBox width="100%" height={52} radius={26} />
          </div>
        </div>
      </div>
    </div>
  )
}
