import mongoose from 'mongoose';

const riskProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    profile: {
      type: String,
      enum: ['conservative', 'moderate', 'aggressive'],
      required: true,
    },
    answers: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    completedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const RiskProfile = mongoose.model('RiskProfile', riskProfileSchema);

export default RiskProfile;