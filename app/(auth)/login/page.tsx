// app/(auth)/login/page.tsx
import type { Metadata } from 'next'
import LoginClient from './login-client'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default function LoginPage() {
  return <LoginClient />
}