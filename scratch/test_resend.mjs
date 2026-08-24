import dotenv from 'dotenv';
dotenv.config();
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

try {
  const { data, error } = await resend.emails.send({
    from: 'Fin4Sure <onboarding@resend.dev>',
    to: ['delivered@resend.dev'],  // Resend's built-in test address — always succeeds
    subject: 'Fin4Sure OTP Test: 1234',
    html: '<h1>Your OTP is <strong>1234</strong></h1><p>This is a test email from Fin4Sure.</p>',
  });

  if (error) {
    console.error('❌ Resend error:', JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log('✅ Resend is working! Message ID:', data?.id);
  console.log('   API Key prefix:', process.env.RESEND_API_KEY?.slice(0, 8) + '...');
} catch (e) {
  console.error('❌ Exception:', e.message);
  process.exit(1);
}
