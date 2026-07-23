// app/(auth)/login/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import LoginClient from './login-client'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  )
}