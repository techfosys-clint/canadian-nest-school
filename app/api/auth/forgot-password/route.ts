import { Student } from '@/lib/db/models/Student';
import { User } from '@/lib/db/models/User';
import { connectToDatabase } from '@/lib/db/mongodb';
import { getGmailTransporter } from '@/lib/email';
import crypto from 'crypto';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required.' },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const emailLower = email.toLowerCase();
    let account;

    // 1. Check Student first
    account = await Student.findOne({ email: emailLower });

    // 2. Check User if not found in Student
    if (!account) {
      account = await User.findOne({ email: emailLower });
    }

    if (!account) {
      return NextResponse.json(
        {
          success: false,
          error: 'This email address is not registered in our database.',
        },
        { status: 404 },
      );
    }

    // 3. Generate token and set expiration (1 hour)
    const token = crypto.randomBytes(32).toString('hex');
    const expiration = new Date(Date.now() + 3600000); // 1 hour

    account.resetPasswordToken = token;
    account.resetPasswordExpiration = expiration;
    await account.save();

    // 4. Send the actual email using Gmail SMTP via nodemailer
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    const logoUrl = `${appUrl}/logo.png`;

    const transporter = getGmailTransporter();

    if (transporter) {
      try {
        await transporter.sendMail({
          from: `Canadian Nest School <${process.env.GMAIL_USER}>`,
          to: emailLower,
          subject: 'Reset Password Request - Canadian Nest School',
          html: `
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
                  .text { font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 24px; }
                  .btn-container { text-align: center; margin: 32px 0; }
                  .btn { display: inline-block; background-color: #E61C24; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; }
                  .footer { font-size: 13px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 32px; }
                  .link { color: #E61C24; text-decoration: none; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="logo"><img src="${logoUrl}" alt="Canadian Nest School" /></div>
                  <h2 class="title">Password Recovery</h2>
                  <p class="text">Hello,</p>
                  <p class="text">We received a request to reset the password for your Canadian Nest School account. Click the button below to set a new password and recover your access:</p>
                  <div class="btn-container">
                    <a href="${resetUrl}" class="btn" style="color: #ffffff !important;">Reset Password</a>
                  </div>
                  <p class="text">Or copy and paste this link in your browser's address bar:</p>
                  <p class="text" style="word-break: break-all;"><a href="${resetUrl}" class="link">${resetUrl}</a></p>
                  <div class="footer">
                    <p>If you did not make this request, you can safely ignore this email. The link will automatically expire in 1 hour.</p>
                    <p>&copy; 2026 Canadian Nest School Inc. All rights reserved.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
        });
      } catch (mailError) {
        console.error('Failed to send email via Gmail SMTP:', mailError);
      }
    } else {
      console.warn(
        'Gmail SMTP credentials missing. Skipping real email dispatch.',
      );
    }

    // 5. Return success response
    // Only ever include the raw token when explicitly opted in via env flag —
    // never infer this from NODE_ENV, since a misconfigured staging/preview
    // deploy without NODE_ENV=production would otherwise leak reset tokens
    // (full account takeover without needing to read the email).
    const debugTokensEnabled = process.env.ENABLE_DEBUG_TOKEN === 'true';

    return NextResponse.json({
      success: true,
      message: 'If the email exists, a password reset link has been generated.',
      ...(debugTokensEnabled ? { debugToken: token } : {}),
    });
  } catch (error: any) {
    console.error('Forgot Password Error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error.message ||
          'An error occurred while processing forgot password request.',
      },
      { status: 400 },
    );
  }
}
