import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

export function generateToken(user) {
  return jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}
