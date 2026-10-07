import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    targetAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    currentAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: '0.00',
    },
    targetDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active',
      required: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1, targetDate: 1 });

const Goal = mongoose.model('Goal', goalSchema);

export default Goal;