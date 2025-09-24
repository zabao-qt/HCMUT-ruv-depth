// server/models/Device.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const DeviceSchema = new Schema({
  token: { type: String, required: true, unique: true },
  name: String,
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  feeds: {
    type: Map,
    of: String,
    default: {}
  },
  lastReading: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Device || mongoose.model('Device', DeviceSchema);
