import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth/auth'
import { User } from '@/lib/db/models/User'
import { Course } from '@/lib/db/models/Course'

export type StaffRole = 'admin' | 'staff' | 'instructor'

export type StaffUser = {
  _id: { toString(): string }
  role: StaffRole
  permissions?: string[]
  name?: string
  email?: string
}

/** The logged-in admin / staff / instructor account, or null. */
export async function getStaffUser(): Promise<StaffUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) return null
  const decoded = verifyToken(token)
  if (!decoded?.id) return null
  const user = (await User.findById(decoded.id).lean()) as StaffUser | null
  if (!user || !['admin', 'staff', 'instructor'].includes(user.role)) return null
  return user
}

/** Mongo filter matching courses an instructor teaches (any assigned slot). */
export function taughtByFilter(userId: string) {
  return { $or: [{ instructors: userId }, { instructor: userId }] }
}

/** Ids of every course the instructor is assigned to, as strings. */
export async function getTaughtCourseIds(userId: string): Promise<string[]> {
  const ids = await Course.find(taughtByFilter(userId)).distinct('_id')
  return ids.map((id) => String(id))
}

/** True when the instructor is assigned to the given course. */
export function courseHasInstructor(
  course: { instructor?: unknown; instructors?: unknown[] } | null | undefined,
  userId: string,
): boolean {
  if (!course) return false
  if (course.instructor && String(course.instructor) === userId) return true
  return (course.instructors || []).some((id) => String(id) === userId)
}

/**
 * Which courses a staff account may act on for a given area.
 * - admin: every course
 * - staff: every course, but only with the matching permission
 * - instructor: only courses they teach
 * Returns 'all', a list of course ids, or null (no access at all).
 */
export async function getCourseScope(
  user: StaffUser,
  staffPermission: string,
): Promise<'all' | string[] | null> {
  if (user.role === 'admin') return 'all'
  if (user.role === 'staff') {
    return (user.permissions || []).includes(staffPermission) ? 'all' : null
  }
  return getTaughtCourseIds(user._id.toString())
}

export function scopeAllows(scope: 'all' | string[] | null, courseId: unknown): boolean {
  if (!scope) return false
  if (scope === 'all') return true
  return scope.includes(String(courseId))
}
