import mongoose from 'mongoose';

const { Schema } = mongoose;

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', UserSchema);
