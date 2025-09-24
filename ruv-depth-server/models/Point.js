// server/models/Point.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const PointSchema = new Schema({
  profileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Number, required: true },
  latitude: Number,
  longitude: Number,
  sonarDepth: Number,
  pressure: Number
});

export default mongoose.models.Point || mongoose.model('Point', PointSchema);
