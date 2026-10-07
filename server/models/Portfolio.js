import mongoose from 'mongoose';

const holdingSchema = new mongoose.Schema(
  {
    assetType: {
      type: String,
      enum: ['equity', 'gold', 'debt'],
      required: true,
    },
    units: { type: mongoose.Schema.Types.Decimal128, required: true, min: 0 },
    averagePrice: { type: mongoose.Schema.Types.Decimal128, required: true, min: 0 },
    currentPrice: { type: mongoose.Schema.Types.Decimal128, required: true, min: 0 },
    investedAmount: { type: mongoose.Schema.Types.Decimal128, required: true, min: 0 },
    currentValue: { type: mongoose.Schema.Types.Decimal128, required: true, min: 0 },
    allocationPercent: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const portfolioSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    totalInvested: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: '0.00',
    },
    currentValue: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: '0.00',
    },
    totalProfitLoss: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: '0.00',
    },
    holdings: { type: [holdingSchema], default: [] },
  },
  { timestamps: true }
);

const Portfolio = mongoose.model('Portfolio', portfolioSchema);

export default Portfolio;