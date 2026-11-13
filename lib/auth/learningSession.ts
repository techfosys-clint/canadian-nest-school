import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth/auth'
import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'

export async function getLearningSession() {
  const cookieStore = await cookies()
  const studentToken = cookieStore.get('student-token')?.value
  const studentId = studentToken && verifyToken(studentToken)?.id
  if (studentId) {
    const student = await Student.findById(studentId)
    if (student) return { account: student, role: 'student' as const }
  }

  const staffToken = cookieStore.get('payload-token')?.value
  const staffId = staffToken && verifyToken(staffToken)?.id
  const staff = staffId ? await User.findById(staffId) : null
  return staff ? { account: staff, role: staff.role } : null
}
