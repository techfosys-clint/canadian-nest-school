import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'

const origin = process.env.BILLING_TEST_ORIGIN ?? 'http://localhost:3000'
assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname), 'Run this smoke test against a local development server.')
const id = Date.now().toString(36)
const courses = []
const userIds = []
const sandbox = process.argv.includes('--eps-sandbox')

const billingPlans = [
  { type: 'monthly', price: 100, noticeStartOffsetDays: 5 },
  { type: 'quarterly', price: 250, regularPrice: 300, noticeStartOffsetDays: 9 },
  { type: 'one_time', price: 500, regularPrice: 600 },
]

function cookie(user, name) {
  const token = jwt.sign({ id: String(user._id), role: user.role, email: user.email },
    process.env.PAYLOAD_SECRET, { expiresIn: '10m' })
  return name + '=' + token
}

async function request(path, { session, body, status = 200 } = {}) {
  const response = await fetch(origin + path, {
    method: body ? 'POST' : 'GET',
    headers: { ...(session ? { cookie: session } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(45000),
  })
  assert.equal(response.status, status, path)
  return response.json()
}

async function createCourse(admin, suffix, paymentPlans) {
  const title = 'Billing smoke test ' + id + ' ' + suffix
  const slug = 'billing-smoke-' + id + '-' + suffix
  const result = await request('/api/admin/courses', {
    session: admin,
    body: { title, titleBn: title, slug, status: 'published', paymentPlans },
    status: 201,
  })
  const courseId = result.data.course._id
  courses.push(new mongoose.Types.ObjectId(courseId))
  return { courseId, slug }
}

await mongoose.connect(process.env.DATABASE_URL)
const db = mongoose.connection.db
try {
  if (sandbox) assert.match(new URL(process.env.EPS_BASE_URL).hostname, /^sandbox/i)
  const admin = await db.collection('users').findOne({ role: 'admin' })
  assert(admin, 'Development admin is required')
  const adminSession = cookie(admin, 'payload-token')
  const students = db.collection('students')
  const student = { _id: new mongoose.Types.ObjectId(), name: 'Billing smoke test', role: 'student', phone: '01700000000' }
  userIds.push(student._id)
  await students.insertOne(student)
  const studentSession = cookie(student, 'student-token')

  const paid = await createCourse(adminSession, 'paid', billingPlans)
  const free = await createCourse(adminSession, 'free', [{ type: 'one_time', price: 0 }])
  const startDate = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10)
  const batchResult = await request('/api/admin/batches', {
    session: adminSession,
    body: {
      course: paid.courseId, name: 'Evening batch', startDate, durationMonths: 6,
      joinOpensAt: new Date(Date.now() - 86400000).toISOString(),
      joinClosesAt: new Date(Date.now() + 86400000).toISOString(),
      classSchedule: 'Monday at 7 PM', orientationDate: startDate + 'T17:00', firstClassAt: startDate + 'T19:00',
    },
  })
  const batch = batchResult.batch
  const { batches } = await request('/api/courses/' + paid.courseId + '/open-batches')
  assert.equal(batches[0].classSchedule, 'Monday at 7 PM')
  assert.equal(batches[0].orientationDate, batch.orientationDate)
  assert.equal(batches[0].endDate, batch.endDate)
  const denied = await request('/api/enrollments', {
    session: studentSession, status: 400,
    body: { courseId: paid.courseId, batchId: batch._id, paymentPlan: 'two_month', price: 1 },
  })
  assert.equal(denied.success, false)
  const unsigned = await request('/api/enrollments', {
    session: studentSession, status: 400,
    body: { courseId: paid.courseId, batchId: batch._id, paymentPlan: 'monthly' },
  })
  assert.match(unsigned.error, /Accept the payment schedule/)

  if (process.env.BILLING_TEST_PLAYWRIGHT) {
    const { chromium } = await import(process.env.BILLING_TEST_PLAYWRIGHT)
    const browser = await chromium.launch()
    try {
      const page = await browser.newPage()
      await page.context().addCookies([{
        name: 'student-token', value: studentSession.slice('student-token='.length), url: origin,
      }])
      await page.goto(origin + '/en/courses/' + paid.slug)
      await page.getByRole('button', { name: 'Enroll In Course' }).click()
      const dialog = page.getByRole('dialog', { name: 'Choose your batch' })
      await dialog.getByText('Monday at 7 PM').waitFor()
      for (const label of ['Batch starts', 'Batch ends', 'First class', 'Orientation', 'Enrollment closes']) {
        await dialog.getByText(label, { exact: true }).waitFor()
      }
      await dialog.getByRole('radio', { name: /Evening batch/ }).check()
      await dialog.getByRole('button', { name: 'Continue' }).click()
      await page.getByText('Payment options', { exact: true }).waitFor()
      assert.equal(await page.getByRole('radio', { name: /Every two months/ }).count(), 0)
      await page.getByRole('radio', { name: /Every three months/ }).check()
      await page.getByText(/Next payment due/).waitFor()
      await page.getByText(/Discount and savings/).first().waitFor()
      await page.getByText(/Expected payments/).waitFor()
      assert.equal(await page.getByRole('button', { name: /Confirm enrollment/ }).isDisabled(), true)
      await page.getByRole('checkbox', { name: /I understand and agree/ }).check()
      assert.equal(await page.getByRole('button', { name: /Confirm enrollment/ }).isEnabled(), true)
      await page.context().clearCookies()
      await page.goto(origin + '/courses/' + paid.slug)
      await page.getByRole('button', { name: 'কোর্সে ভর্তি হন' }).click()
      const bangla = page.getByRole('dialog', { name: 'ব্যাচ নির্বাচন করুন' })
      await bangla.getByRole('radio', { name: /Evening batch/ }).check()
      await bangla.getByRole('button', { name: 'এগিয়ে যান' }).click()
      await page.getByRole('radio', { name: /প্রতি তিন মাসে/ }).check()
      await page.getByText(/সম্ভাব্য পেমেন্ট সংখ্যা/).waitFor()
      await page.getByRole('button', { name: 'সাইন ইন করে এগিয়ে যান' }).click()
      await page.getByText('পরবর্তী ধাপে যেতে সাইন ইন করুন').waitFor()
      await page.context().addCookies([{ name: 'student-token', value: studentSession.slice('student-token='.length), url: origin }])
      await page.goto(origin + '/checkout/' + free.courseId + '?lang=en')
      const next = page.getByRole('button', { name: 'Next Step' })
      await next.waitFor()
      assert.equal(await page.getByText('Payment options', { exact: true }).count(), 0)
      const freeRequest = page.waitForResponse(response =>
        response.url().endsWith('/api/enrollments') && response.request().method() === 'POST')
      await next.click()
      const result = await (await freeRequest).json()
      assert.equal(result.success, true)
      assert.equal(result.redirectUrl, undefined)
      console.log('Passed browser batch modal, plan selection, savings, due date, and free checkout.')
    } finally {
      await browser.close()
    }
  }

  const completed = await request('/api/enrollments', {
    session: studentSession, body: { courseId: free.courseId, paymentPlan: 'one_time' },
  })
  assert.equal(completed.success, true)
  assert.equal(completed.redirectUrl, undefined)
  const freeEnrollment = await db.collection('enrollments').findOne({ _id: new mongoose.Types.ObjectId(completed.enrollmentId) })
  assert.equal(freeEnrollment.paymentStatus, 'completed')
  assert.equal(freeEnrollment.pricePaid, 0)
  console.log('Passed batch availability, disabled plan rejection, and free enrollment.')

  if (sandbox) {
    await students.updateOne({ _id: student._id }, { $set: { email: 'billing-smoke-' + id + '@example.com' } })
    const pending = await request('/api/enrollments', {
      session: studentSession,
      body: { courseId: paid.courseId, batchId: batch._id, paymentPlan: 'quarterly', acceptPaymentTerms: true, price: 1 },
    })
    const paidEnrollment = await db.collection('enrollments').findOne({ student: student._id, course: new mongoose.Types.ObjectId(paid.courseId) })
    assert(paidEnrollment, 'Paid checkout did not create an enrollment')
    assert.equal(paidEnrollment.pricePaid, 250)
    assert.equal(paidEnrollment.billingType, 'quarterly')
    assert.equal(String(paidEnrollment.batch), batch._id)
    assert.equal(paidEnrollment.calendarBillingAnchor.toISOString(), batch.startDate)
    console.log('Verified paid checkout used the configured amount, plan, and billing anchor.')
    assert.equal(pending.success, true, pending.error)
    assert.match(pending.redirectUrl, /^https:\/\//)
    assert.equal(paidEnrollment.paymentStatus, 'pending')
    console.log('Passed EPS sandbox handoff.')
  }
} finally {
  await db.collection('enrollments').deleteMany({ student: { $in: userIds } })
  await db.collection('students').deleteMany({ _id: { $in: userIds } })
  await db.collection('batches').deleteMany({ course: { $in: courses } })
  await db.collection('courses').deleteMany({ _id: { $in: courses } })
  await mongoose.disconnect()
}
