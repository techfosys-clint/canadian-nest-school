import { formatBdDateTime } from '@/lib/bdTime';
import nodemailer from 'nodemailer';

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null =
  null;

export function getGmailTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.error(
      'GMAIL_USER or GMAIL_APP_PASSWORD is not defined in environment variables.',
    );
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });

  return cachedTransporter;
}

export async function sendEnrollmentConfirmationEmail(
  toEmail: string,
  studentName: string,
  courseTitle: string,
  pricePaid: number,
  paymentReference: string,
  enrolledAt: Date,
) {
  const transporter = getGmailTransporter();
  const fromEmail = process.env.GMAIL_USER;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const logoUrl = `${appUrl}/logo.png`;

  if (!transporter) {
    return false;
  }

  const formattedDate = formatBdDateTime(enrolledAt, {
    month: 'long',
  });

  const formattedPrice = new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
  }).format(pricePaid);

  const subject = `🎉 You're Enrolled! "${courseTitle}" - Canadian Nest School`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1f2937; margin: 0; padding: 40px 20px; }
        .container { max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .logo { display: block; margin-bottom: 24px; }
        .logo img { height: 44px; width: auto; }
        .title { font-size: 24px; font-weight: bold; color: #111827; margin-bottom: 16px; }
        .text { font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 20px; }
        .invoice { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 4px 20px; margin: 24px 0; width: 100%; border-collapse: collapse; }
        .invoice-row td { padding: 12px 0; font-size: 15px; border-bottom: 1px solid #e5e7eb; }
        .invoice-row td:first-child { color: #6b7280; font-weight: 600; }
        .invoice-row td:last-child { color: #111827; font-weight: bold; text-align: right; }
        .invoice-total td { border-bottom: none; }
        .invoice-total td:last-child { color: #E61C24 !important; font-size: 18px; }
        .btn-container { text-align: center; margin: 32px 0; }
        .btn { display: inline-block; background-color: #E61C24; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; }
        .footer { font-size: 13px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 32px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo"><img src="${logoUrl}" alt="Canadian Nest School" /></div>
        <h2 class="title">🎉 Congratulations, ${studentName}!</h2>
        <p class="text">
          Your enrollment in <strong>${courseTitle}</strong> is confirmed. You now have full access to the course — let's get started!
        </p>

        <table class="invoice" cellpadding="0" cellspacing="0" role="presentation" style="width: 100%; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin: 24px 0;">
          <tr class="invoice-row">
            <td style="padding: 12px 20px; font-size: 15px; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Course</td>
            <td style="padding: 12px 20px; font-size: 15px; color: #111827; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">${courseTitle}</td>
          </tr>
          <tr class="invoice-row">
            <td style="padding: 12px 20px; font-size: 15px; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Invoice Reference</td>
            <td style="padding: 12px 20px; font-size: 15px; color: #111827; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">${paymentReference}</td>
          </tr>
          <tr class="invoice-row">
            <td style="padding: 12px 20px; font-size: 15px; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Date</td>
            <td style="padding: 12px 20px; font-size: 15px; color: #111827; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">${formattedDate}</td>
          </tr>
          <tr class="invoice-row invoice-total">
            <td style="padding: 12px 20px; font-size: 15px; color: #6b7280; font-weight: 600;">Amount Paid</td>
            <td style="padding: 12px 20px; font-size: 18px; color: #E61C24; font-weight: bold; text-align: right;">${formattedPrice}</td>
          </tr>
        </table>

        <div class="btn-container">
          <a href="${appUrl}/dashboard" class="btn" style="color: #ffffff !important;">Go to My Dashboard</a>
        </div>

        <div class="footer">
          <p>Keep this email as your receipt for this purchase.</p>
          <p>&copy; 2026 Canadian Nest School Inc. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `Canadian Nest School <${fromEmail}>`,
      to: toEmail,
      subject,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Failed to send enrollment confirmation email:', error);
    return false;
  }
}

export async function sendOrderConfirmationEmail(
  toEmail: string,
  customerName: string,
  items: { title: string; price: number; quantity: number }[],
  totalAmount: number,
  paymentReference: string,
  shippingAddress: string,
  orderedAt: Date,
) {
  const transporter = getGmailTransporter();
  const fromEmail = process.env.GMAIL_USER;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const logoUrl = `${appUrl}/logo.png`;

  if (!transporter) {
    return false;
  }

  const formattedDate = formatBdDateTime(orderedAt, {
    month: 'long',
  });

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);

  const itemRows = items
    .map(
      (item) => `
        <tr class="invoice-row">
          <td style="padding: 12px 20px; font-size: 15px; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb;">${item.title} &times; ${item.quantity}</td>
          <td style="padding: 12px 20px; font-size: 15px; color: #111827; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">${formatMoney(item.price * item.quantity)}</td>
        </tr>`,
    )
    .join('');

  const subject = `📦 Order Confirmed - Canadian Nest School Shop`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1f2937; margin: 0; padding: 40px 20px; }
        .container { max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .logo { display: block; margin-bottom: 24px; }
        .logo img { height: 44px; width: auto; }
        .title { font-size: 24px; font-weight: bold; color: #111827; margin-bottom: 16px; }
        .text { font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 20px; }
        .invoice { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 4px 20px; margin: 24px 0; width: 100%; border-collapse: collapse; }
        .invoice-row td { padding: 12px 0; font-size: 15px; border-bottom: 1px solid #e5e7eb; }
        .invoice-total td { border-bottom: none; }
        .invoice-total td:last-child { color: #E61C24 !important; font-size: 18px; }
        .btn-container { text-align: center; margin: 32px 0; }
        .btn { display: inline-block; background-color: #E61C24; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; }
        .footer { font-size: 13px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 32px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo"><img src="${logoUrl}" alt="Canadian Nest School" /></div>
        <h2 class="title">📦 Thank you, ${customerName}!</h2>
        <p class="text">
          Your order has been confirmed and payment received. We're preparing your items for shipment to the address below.
        </p>

        <table class="invoice" cellpadding="0" cellspacing="0" role="presentation" style="width: 100%; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin: 24px 0;">
          ${itemRows}
          <tr class="invoice-row">
            <td style="padding: 12px 20px; font-size: 15px; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Invoice Reference</td>
            <td style="padding: 12px 20px; font-size: 15px; color: #111827; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">${paymentReference}</td>
          </tr>
          <tr class="invoice-row">
            <td style="padding: 12px 20px; font-size: 15px; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Date</td>
            <td style="padding: 12px 20px; font-size: 15px; color: #111827; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">${formattedDate}</td>
          </tr>
          <tr class="invoice-row">
            <td style="padding: 12px 20px; font-size: 15px; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Shipping Address</td>
            <td style="padding: 12px 20px; font-size: 15px; color: #111827; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">${shippingAddress}</td>
          </tr>
          <tr class="invoice-row invoice-total">
            <td style="padding: 12px 20px; font-size: 15px; color: #6b7280; font-weight: 600;">Amount Paid</td>
            <td style="padding: 12px 20px; font-size: 18px; color: #E61C24; font-weight: bold; text-align: right;">${formatMoney(totalAmount)}</td>
          </tr>
        </table>

        <div class="btn-container">
          <a href="${appUrl}/dashboard/orders" class="btn" style="color: #ffffff !important;">View My Orders</a>
        </div>

        <div class="footer">
          <p>Keep this email as your receipt for this purchase.</p>
          <p>&copy; 2026 Canadian Nest School Inc. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `Canadian Nest School <${fromEmail}>`,
      to: toEmail,
      subject,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Failed to send order confirmation email:', error);
    return false;
  }
}

export async function sendStaffRegistrationEmail(
  toEmail: string,
  name: string,
  role: string,
  rawPassword: string,
) {
  const transporter = getGmailTransporter();
  const fromEmail = process.env.GMAIL_USER;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!transporter) {
    return false;
  }

  const subject = `Welcome to Canadian Nest School - Your ${role.toUpperCase()} Account is Ready`;
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px; background-color: #ffffff; color: #1f2937;">
      <h2 style="color: #615fff; margin-bottom: 20px; font-weight: bold;">Welcome to Canadian Nest School, ${name}!</h2>
      <p style="font-size: 16px; color: #4b5563; line-height: 1.6;">
        An administrative account has been created for you on the <strong>Canadian Nest School Admin Panel</strong>.
      </p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
        <p style="margin: 8px 0; font-size: 16px;"><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
        <p style="margin: 8px 0; font-size: 16px;"><strong>Email:</strong> ${toEmail}</p>
        <p style="margin: 8px 0; font-size: 16px;"><strong>Password:</strong> <span style="font-family: monospace; font-weight: bold; background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${rawPassword}</span></p>
      </div>
      <p style="font-size: 16px; color: #4b5563; line-height: 1.6;">
        You can log in to your dashboard here: <a href="${appUrl}/admin/login" style="color: #615fff; font-weight: bold; text-decoration: none;">Canadian Nest School Admin Login</a>
      </p>
      <p style="font-size: 14px; color: #9ca3af; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
        For security reasons, we highly recommend changing your password after your first login.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `Canadian Nest School <${fromEmail}>`,
      to: toEmail,
      subject: subject,
      html: htmlContent,
    });

    return true;
  } catch (error) {
    console.error('Failed to send registration email:', error);
    return false;
  }
}

export async function sendLiveClassReminderEmail(
  toEmail: string,
  instructorName: string,
  courseTitle: string,
  lessonTitle: string,
  liveDate: Date,
  livePlatform: string,
  liveUrl: string,
) {
  const transporter = getGmailTransporter();
  const fromEmail = process.env.GMAIL_USER;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!transporter) {
    return false;
  }

  const formattedDate = formatBdDateTime(liveDate, {
    weekday: 'long',
    month: 'long',
  });

  const subject = `⚠️ URGENT REMINDER: Your Live Class Starts Soon!`;
  const bannerUrl = `${appUrl}/media/live-class-reminder.png`;

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
          Canadian Nest School Admin Portal • Automated Reminder Notification
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `Canadian Nest School <${fromEmail}>`,
      to: toEmail,
      subject: subject,
      html: htmlContent,
    });

    return true;
  } catch (error) {
    console.error('Failed to send live class reminder email:', error);
    return false;
  }
}

export async function checkAndSendLiveClassReminders() {
  try {
    const { connectToDatabase } = await import('@/lib/db/mongodb');
    await connectToDatabase();

    const { Lesson } = await import('@/lib/db/models/Lesson');
    const { Course } = await import('@/lib/db/models/Course');

    // Find live classes starting in the next 2 hours (or already started in the last 15 minutes) that haven't received a reminder yet
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    const upcomingLessons = await Lesson.find({
      lessonType: 'live',
      liveDate: { $gte: fifteenMinutesAgo, $lte: twoHoursLater },
      liveUrl: { $exists: true, $ne: '' },
      $or: [{ reminderSent: { $exists: false } }, { reminderSent: false }],
    }).populate('course');

    if (upcomingLessons.length === 0) return;

    for (const lesson of upcomingLessons) {
      const course = lesson.course;
      if (!course) continue;

      // Fetch course details to get the instructor
      const courseDoc = await Course.findById(course._id || course).populate(
        'instructor',
      );
      if (!courseDoc || !courseDoc.instructor) continue;

      const instructor = courseDoc.instructor as any;
      if (!instructor.email) continue;

      const success = await sendLiveClassReminderEmail(
        instructor.email,
        instructor.name,
        courseDoc.title,
        lesson.title,
        lesson.liveDate,
        lesson.livePlatform || 'zoom',
        lesson.liveUrl,
      );

      if (success) {
        lesson.reminderSent = true;
        await lesson.save();
      }
    }
  } catch (error) {
    console.error('Error checking and sending live class reminders:', error);
  }
}
