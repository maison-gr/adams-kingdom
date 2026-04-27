import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  deviceId:  { type: String, required: true, unique: true, index: true },
  name:      { type: String, required: true, default: 'Knight' },
  coins:     { type: Number, default: 500 },
  spins:     { type: Number, default: 10 },
  shields:   { type: Number, default: 0 },
  buildings: { type: [Number], default: [0, 0, 0, 0, 0, 0] },
  attacks:   { type: Number, default: 0 },
  lastSeen:  { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Player', playerSchema);
