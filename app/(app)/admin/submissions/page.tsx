import React from 'react'
import SubmissionsPageClient from './SubmissionsPageClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Grading Submissions - Canadian Nest School Admin',
}

export default function AdminSubmissionsPage() {
  return <SubmissionsPageClient />
}
