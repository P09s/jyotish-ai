'use client'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    
    // 1. Tell Next.js to invalidate the cache and re-render server components
    router.refresh() 
    
    // 2. Navigate to the homepage
    router.push('/')
  }

  return (
    <button onClick={handleSignOut} className="btn-ghost" style={{ fontSize: 13, padding: '7px 16px' }}>
      Sign out
    </button>
  )
}