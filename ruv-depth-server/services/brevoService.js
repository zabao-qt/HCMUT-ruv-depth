import axios from 'axios';

const API_BASE = 'https://api.brevo.com/v3';

export async function sendOtpEmail({ toEmail, toName, subject, htmlContent, textContent }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY not set');

  const payload = {
    sender: { name: process.env.BREVO_SENDER_NAME || 'App', email: process.env.BREVO_SENDER_EMAIL },
    to: [{ email: toEmail, name: toName }],
    subject,
    htmlContent,
    textContent,
  };

  const res = await axios.post(`${API_BASE}/smtp/email`, payload, {
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' }
  });
  return res.data;
}
