import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to dashboard or login based on auth status
  // This is handled by middleware, but we redirect here as fallback
  redirect('/login')
}
