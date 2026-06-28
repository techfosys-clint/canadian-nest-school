import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { User } from '@/lib/db/models/User'

const PAYLOAD_SECRET = process.env.PAYLOAD_SECRET as string
if (!PAYLOAD_SECRET) {
  throw new Error('❌ PAYLOAD_SECRET environment variable is required! Set it in .env.local')
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(payload: any): string {
  return jwt.sign(payload, PAYLOAD_SECRET, { expiresIn: '365d' })
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, PAYLOAD_SECRET)
  } catch (error) {
    return null
  }
}

/**
 * Resolves the authenticated staff/admin/instructor user from the
 * "payload-token" cookie and enforces role + (for staff) permission checks.
 * Returns null if unauthenticated, wrong role, or missing permission.
 *
 * Admins always pass the permission check. Staff must have the named
 * permission in their `permissions[]` array — this is the single source of
 * truth for backend authorization, mirroring the nav visibility rules in
 * app/(app)/admin/layout.tsx so the permission model is actually enforced
 * server-side, not just hidden in the UI.
 */
export async function getAuthorizedUser(
  allowedRoles: string[] = ['admin', 'staff'],
  permission?: string
) {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) return null

  const decoded = verifyToken(token)
  if (!decoded?.id) return null

  const user = await User.findById(decoded.id).lean()
  if (!user || !allowedRoles.includes(user.role)) return null

  // Permission-array gating only applies to the 'staff' role — admins always
  // have full access, and instructors are scoped by ownership checks instead
  // of the permissions[] array (matching the frontend nav fallback logic).
  if (permission && user.role === 'staff') {
    const permissions: string[] = (user as any).permissions || []
    if (!permissions.includes(permission)) return null
  }

  return user
}

/**
 * Determines whether the given user id is the super admin — the account
 * with isSuperAdmin: true, or (for accounts created before that field
 * existed) the oldest admin account as a fallback, so legacy installs still
 * have exactly one protected root account. Used to block deletion of the
 * super admin by anyone, including other admins.
 */
export async function isSuperAdminAccount(userId: string): Promise<boolean> {
  const flagged = await User.findOne({ isSuperAdmin: true }).lean()
  if (flagged) {
    return flagged._id.toString() === userId
  }

  const oldestAdmin = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 }).lean()
  return !!oldestAdmin && oldestAdmin._id.toString() === userId
}
