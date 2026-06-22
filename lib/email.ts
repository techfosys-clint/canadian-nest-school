import nodemailer from 'nodemailer'

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null

export function getGmailTransporter() {
  if (cachedTransporter) return cachedTransporter

  const gmailUser = process.env.GMAIL_USER
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD

  if (!gmailUser || !gmailAppPassword) {
    console.error('GMAIL_USER or GMAIL_APP_PASSWORD is not defined in environment variables.')
    return null
  }

  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  })

  return cachedTransporter
}

export async function sendStaffRegistrationEmail(toEmail: string, name: string, role: string, rawPassword: string) {
  const transporter = getGmailTransporter()
  const fromEmail = process.env.GMAIL_USER

  if (!transporter) {
    return false
  }

  const subject = `Welcome to Tutor Space - Your ${role.toUpperCase()} Account is Ready`
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px; background-color: #ffffff; color: #1f2937;">
      <h2 style="color: #615fff; margin-bottom: 20px; font-weight: bold;">Welcome to Tutor Space, ${name}!</h2>
      <p style="font-size: 16px; color: #4b5563; line-height: 1.6;">
        An administrative account has been created for you on the <strong>Tutor Space Admin Panel</strong>.
      </p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
        <p style="margin: 8px 0; font-size: 16px;"><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
        <p style="margin: 8px 0; font-size: 16px;"><strong>Email:</strong> ${toEmail}</p>
        <p style="margin: 8px 0; font-size: 16px;"><strong>Password:</strong> <span style="font-family: monospace; font-weight: bold; background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${rawPassword}</span></p>
      </div>
      <p style="font-size: 16px; color: #4b5563; line-height: 1.6;">
        You can log in to your dashboard here: <a href="http://localhost:3000/admin/login" style="color: #615fff; font-weight: bold; text-decoration: none;">Tutor Space Admin Login</a>
      </p>
      <p style="font-size: 14px; color: #9ca3af; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
        For security reasons, we highly recommend changing your password after your first login.
      </p>
    </div>
  `

  try {
    await transporter.sendMail({
      from: `Tutor Space <${fromEmail}>`,
      to: toEmail,
      subject: subject,
      html: htmlContent,
    })

    return true
  } catch (error) {
    console.error('Failed to send registration email:', error)
    return false
  }
}

export async function sendLiveClassReminderEmail(
  toEmail: string,
  instructorName: string,
  courseTitle: string,
  lessonTitle: string,
  liveDate: Date,
  livePlatform: string,
  liveUrl: string
) {
  const transporter = getGmailTransporter()
  const fromEmail = process.env.GMAIL_USER
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!transporter) {
    return false
  }

  const formattedDate = new Date(liveDate).toLocaleString('en-BD', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Dhaka'
  })

  const subject = `⚠️ URGENT REMINDER: Your Live Class Starts Soon!`
  const bannerUrl = `${appUrl}/media/live-class-reminder.png`

  const htmlContent = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #27272a; border-radius: 8px; background-color: #070b16; color: #ffffff; overflow: hidden;">
      <!-- Header Banner Image -->
      <div style="width: 100%; height: auto; display: block; border-bottom: 2px solid #615fff;">
        <img src="${bannerUrl}" alt="Live Class Reminder" style="width: 100%; max-width: 600px; height: auto; display: block;" />
      </div>
      
      <!-- Body Content -->
      <div style="padding: 30px;">
        <h2 style="color: #615fff; font-size: 24px; font-weight: bold; margin-top: 0; margin-bottom: 10px;">Hi Instructor ${instructorName},</h2>
        <p style="font-size: 16px; color: #a1a1aa; line-height: 1.6; margin-bottom: 20px;">
          This is an automated reminder that your scheduled live lecture is starting soon. Please prepare your materials and join on time to welcome your students!
        </p>
        
        <!-- Live Class Details Card -->
        <div style="background: rgba(97, 95, 255, 0.05); border: 1px solid rgba(97, 95, 255, 0.2); padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #ffffff; font-size: 18px; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #27272a; padding-bottom: 8px; font-weight: bold;">
            Live Session Details
          </h3>
          <p style="margin: 8px 0; font-size: 15px; color: #e4e4e7;">
            <strong style="color: #615fff;">Course:</strong> ${courseTitle}
          </p>
          <p style="margin: 8px 0; font-size: 15px; color: #e4e4e7;">
            <strong style="color: #615fff;">Lesson:</strong> ${lessonTitle}
          </p>
          <p style="margin: 8px 0; font-size: 15px; color: #e4e4e7;">
            <strong style="color: #615fff;">Date & Time:</strong> ${formattedDate}
          </p>
          <p style="margin: 8px 0; font-size: 15px; color: #e4e4e7;">
            <strong style="color: #615fff;">Platform:</strong> <span style="text-transform: uppercase; font-weight: bold;">${livePlatform}</span>
          </p>
        </div>
        
        <!-- Action Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${liveUrl}" style="background-color: #615fff; color: #ffffff; font-weight: bold; font-size: 16px; text-decoration: none; padding: 14px 30px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 10px rgba(97, 95, 255, 0.3); transition: all 0.2s;">
            Launch Meeting / Join Now
          </a>
        </div>
        
        <p style="font-size: 14px; color: #71717a; text-align: center; margin-top: 40px; border-top: 1px solid #18181b; padding-top: 20px;">
          Tutor Space Admin Portal • Automated Reminder Notification
        </p>
      </div>
    </div>
  `

  try {
    await transporter.sendMail({
      from: `Tutor Space <${fromEmail}>`,
      to: toEmail,
      subject: subject,
      html: htmlContent,
    })

    return true
  } catch (error) {
    console.error('Failed to send live class reminder email:', error)
    return false
  }
}

export async function checkAndSendLiveClassReminders() {
  try {
    const { connectToDatabase } = await import('@/lib/db/mongodb')
    await connectToDatabase()

    const { Lesson } = await import('@/lib/db/models/Lesson')
    const { Course } = await import('@/lib/db/models/Course')
    const { User } = await import('@/lib/db/models/User')

    // Find live classes starting in the next 2 hours (or already started in the last 15 minutes) that haven't received a reminder yet
    const now = new Date()
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)

    const upcomingLessons = await Lesson.find({
      lessonType: 'live',
      liveDate: { $gte: fifteenMinutesAgo, $lte: twoHoursLater },
      liveUrl: { $exists: true, $ne: '' },
      $or: [
        { reminderSent: { $exists: false } },
        { reminderSent: false }
      ]
    }).populate('course')

    if (upcomingLessons.length === 0) return

    console.log(`Found ${upcomingLessons.length} upcoming live classes requiring reminders.`)

    for (const lesson of upcomingLessons) {
      const course = lesson.course
      if (!course) continue

      // Fetch course details to get the instructor
      const courseDoc = await Course.findById(course._id || course).populate('instructor')
      if (!courseDoc || !courseDoc.instructor) continue

      const instructor = courseDoc.instructor as any
      if (!instructor.email) continue

      console.log(`Sending live reminder for "${lesson.title}" to instructor "${instructor.name}" (${instructor.email})`)

      const success = await sendLiveClassReminderEmail(
        instructor.email,
        instructor.name,
        courseDoc.title,
        lesson.title,
        lesson.liveDate,
        lesson.livePlatform || 'zoom',
        lesson.liveUrl
      )

      if (success) {
        lesson.reminderSent = true
        await lesson.save()
        console.log(`Successfully marked lesson "${lesson.title}" reminder as sent.`)
      }
    }
  } catch (error) {
    console.error('Error checking and sending live class reminders:', error)
  }
}
