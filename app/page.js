// Root page — middleware handles redirecting to /dashboard or /login
// This is a fallback that shouldn't normally be seen
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/login')
}
