import { Metadata } from 'next'
import UserDetailClient from './UserDetailClient'

export const metadata: Metadata = {
  title: 'User Details | Admin',
  description: 'View a single user account and their activity',
}

export const dynamic = 'force-dynamic'

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <UserDetailClient id={id} />
}
