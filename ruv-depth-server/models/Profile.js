// server/models/Profile.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const ProfileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: String,
  description: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);
