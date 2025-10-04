import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOtp, verifyOtp, authMe } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function VerifyOtp() {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const navigate = useNavigate();

  const email = localStorage.getItem('signup_email') || user?.email || '';

  async function onResend() {
    try {
      await sendOtp(email);
      setStatus('OTP resent');
    } catch (err: any) {
      setStatus(err?.response?.data?.error || 'Resend failed');
    }
  }

  async function onVerify() {
    try {
      const res = await verifyOtp(email, code);
      // if server returns token, store it
      const token = res?.data?.token;
      if (token) {
        localStorage.setItem('token', token);
      }

      // If server returned user data, you can use it; otherwise call authMe to get user
      if (res?.data?.user) {
        // Optionally set user via context - but AuthContext will pick up token via its useEffect
        // We just navigate now; AuthProvider will call authMe automatically because token is set
      } else if (token) {
        // fetch user after token set
        await authMe();
      }

      setStatus('Verified successfully');
      localStorage.removeItem('signup_email');
      navigate('/');
    } catch (err: any) {
      setStatus(err?.response?.data?.error || 'Verify failed');
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">Verify your email</h2>
      <p className="mb-2">Enter the 6-digit code sent to <span className="font-medium">{email}</span></p>
      <input
        className="w-full border px-3 py-2 rounded mb-3"
        placeholder="123456"
        value={code}
        onChange={e => setCode(e.target.value)}
      />
      <div className="flex gap-2">
        <button onClick={onVerify} className="flex-1 py-2 bg-green-600 text-white rounded">Verify</button>
        <button onClick={onResend} className="flex-1 py-2 bg-gray-500 text-white rounded">Resend</button>
      </div>
      {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}
    </div>
  );
}
