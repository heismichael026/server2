import nodemailer from 'nodemailer';
import { env } from '../config/env';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.emailHost || !env.emailUser) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.emailHost,
      port: env.emailPort,
      secure: env.emailPort === 465,
      auth: {
        user: env.emailUser,
        pass: env.emailPassword,
      },
    });
  }
  return transporter;
}

export async function sendContactNotification(payload: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}): Promise<void> {
  const transport = getTransporter();
  if (!transport) {
    console.warn('[email] EMAIL_HOST not configured — skipping contact email send');
    return;
  }

  const subject = `New contact/feedback message from ${payload.name}`;
  const text = [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    payload.phone ? `Phone: ${payload.phone}` : '',
    '',
    'Message:',
    payload.message,
  ]
    .filter(Boolean)
    .join('\n');

  await transport.sendMail({
    from: env.emailUser,
    to: env.restaurantEmail,
    subject,
    text,
    replyTo: payload.email,
  });
}
