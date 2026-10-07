import mongoose from 'mongoose';

const roundUpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
    },
    originalAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    roundedAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    roundUpAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'invested', 'skipped'],
      default: 'pending',
      required: true,
    },
    investedAt: {
      type: Date,
      default: null,
    },
    allocationExecution: {
      type: new mongoose.Schema(
        {
          allocationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Allocation',
            required: true,
          },
          riskProfileId: {
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
          equityAmount: { type: mongoose.Schema.Types.Decimal128, required: true },
          goldAmount: { type: mongoose.Schema.Types.Decimal128, required: true },
          debtAmount: { type: mongoose.Schema.Types.Decimal128, required: true },
          executedAt: { type: Date, required: true },
        },
        { _id: false }
      ),
      default: undefined,
    },
  },
  { timestamps: true }
);

roundUpSchema.index({ userId: 1, transactionId: 1 }, { unique: true });

const RoundUp = mongoose.model('RoundUp', roundUpSchema);

export default RoundUp;