import mongoose, { Schema, Document } from 'mongoose';

export interface IStreamConfig extends Document {
  userId: string; // email address
  streamKey: string;
  rtmpUrl?: string; // Optional custom RTMP URL, empty means use default
  platform: string; // youtube, twitch, etc.
  platformName: string;
  platformLogoIcon: string;
  maskedStreamKey: string;
  createdAt: string;
  updatedAt: Date;
  streamStartTime?: number; // Unix timestamp (ms) when stream started, null when not streaming
}

const StreamConfigSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  streamKey: {
    type: String,
    required: true
  },
  rtmpUrl: {
    type: String,
    default: ''
  },
  platform: {
    type: String,
    required: true
  },
  platformName: {
    type: String,
    required: true
  },
  platformLogoIcon: {
    type: String,
    required: true
  },
  maskedStreamKey: {
    type: String,
    required: true
  },
  createdAt: {
    type: String,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  streamStartTime: {
    type: Number,
    default: null
  }
});

// Compound index to ensure one config per user per platform
StreamConfigSchema.index({ userId: 1, platform: 1 }, { unique: true });

export default mongoose.model<IStreamConfig>('StreamConfig', StreamConfigSchema);
