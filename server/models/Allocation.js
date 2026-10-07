import mongoose from 'mongoose';

const allocationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    riskProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RiskProfile',
      required: true,
    },
    riskLevel: {
      type: String,
      enum: ['conservative', 'moderate', 'aggressive'],
      required: true,
    },
    equityPercent: { type: Number, required: true, min: 0, max: 100 },
    goldPercent: { type: Number, required: true, min: 0, max: 100 },
    debtPercent: { type: Number, required: true, min: 0, max: 100 },
  },
  { timestamps: true }
);

allocationSchema.pre('validate', function validateAllocationTotal() {
  const total = this.equityPercent + this.goldPercent + this.debtPercent;
  if (total !== 100) {
    this.invalidate('debtPercent', 'Allocation percentages must total exactly 100');
  }
});

const Allocation = mongoose.model('Allocation', allocationSchema);

export default Allocation;