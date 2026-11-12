import { redirect } from 'next/navigation'

/** Fee SMS reminders now live inside each course's billing settings. */
export default function SmsRemindersPage() {
  redirect('/admin/courses')
}
