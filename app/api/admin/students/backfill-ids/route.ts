import { getAuthorizedUser } from '@/lib/auth/auth'
import { connectToDatabase } from '@/lib/db/mongodb'
import { backfillStudentIds } from '@/lib/students/studentId'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Assigns lifelong CNS-YYYY-#### IDs to every student missing one.
 * Safe to re-run. Use once on each database (dev / prod) after deploy.
 */
export async function POST() {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin'])
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 401 })
    }

    const summary = await backfillStudentIds()
    return NextResponse.json({
      success: true,
      message: 'Student ID backfill finished.',
      summary,
    })
  } catch (error: any) {
    console.error('Student ID backfill error:', error)
    return NextResponse.json(
      { error: error.message || 'Backfill failed.' },
      { status: 500 },
    )
  }
}

export async function GET() {
  return POST()
}
