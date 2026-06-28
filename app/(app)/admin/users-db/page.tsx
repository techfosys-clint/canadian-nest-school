import { Metadata } from 'next'
import UsersDatabaseClient from './UsersDatabaseClient'

export const metadata: Metadata = {
  title: 'User Database | Admin',
  description: 'Manage all students, instructors, and staff accounts',
}

export default function UsersDatabasePage() {
  return <UsersDatabaseClient />
}
