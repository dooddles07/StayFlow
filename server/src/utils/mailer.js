import { Resend } from 'resend'
import { env } from '../config/env.js'

// Instantiated only when a key is present. No key => dev mode: links are logged, not sent.
const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null

/**
 * Sends one transactional email via Resend. When no key is configured, the message is
 * logged to the server console instead so local flows stay testable without a provider.
 * The raw token lives inside `html`/`text`; never log those in production.
 */
async function sendMail({ to, subject, html, text, devLog }) {
  if (!resend) {
    // env.js refuses to boot without a key in production, so this branch is
    // development-only by construction. The guard is belt-and-braces: a link
    // printed here contains a live single-use credential, and a log stream is
    // not a place to put one.
    if (!env.isProd) {
      console.log(
        `[mailer] (no RESEND_API_KEY) would send "${subject}" to ${to} — ${devLog}`,
      )
    }
    return
  }
  const { error } = await resend.emails.send({
    from: env.mailFrom,
    to,
    subject,
    html,
    text,
  })
  if (error) {
    // Surface to the caller so the auth flow can decide how to react, but keep the message generic upstream.
    throw new Error(
      `Email delivery failed: ${error.message ?? 'unknown error'}`,
    )
  }
}

const wrap = (heading, body, cta, link) => `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1c1c46">
    <h1 style="font-size:20px;margin:0 0 12px">${heading}</h1>
    <p style="font-size:14px;line-height:1.6;margin:0 0 24px;color:#475569">${body}</p>
    <a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600">${cta}</a>
    <p style="font-size:12px;line-height:1.6;margin:24px 0 0;color:#94a3b8">If the button doesn't work, paste this link into your browser:<br>${link}</p>
    <p style="font-size:12px;line-height:1.6;margin:16px 0 0;color:#94a3b8">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
  </div>`

export async function deliverResetToken(user, rawToken) {
  const link = `${env.appUrl}/reset-password?token=${rawToken}`
  await sendMail({
    to: user.email,
    subject: 'Reset your StayFlow password',
    html: wrap(
      'Reset your password',
      'We received a request to reset the password on your StayFlow account.',
      'Set a new password',
      link,
    ),
    text: `Reset your StayFlow password: ${link}`,
    devLog: link,
  })
}

export async function deliverEmailChange(user, newEmail, rawToken) {
  const link = `${env.appUrl}/verify-email?token=${rawToken}`
  await sendMail({
    to: newEmail,
    subject: 'Confirm your new StayFlow email',
    html: wrap(
      'Confirm your new email',
      'Confirm this address to make it the new sign-in email for your StayFlow account.',
      'Confirm email change',
      link,
    ),
    text: `Confirm your new StayFlow email: ${link}`,
    devLog: link,
  })
}
