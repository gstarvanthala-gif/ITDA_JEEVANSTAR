import mongoose from 'mongoose';

const portfolioHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: { type: Date, required: true },
    investedValue: { type: mongoose.Schema.Types.Decimal128, required: true },
    portfolioValue: { type: mongoose.Schema.Types.Decimal128, required: true },
    profitLoss: { type: mongoose.Schema.Types.Decimal128, required: true },
  },
  { timestamps: true }
);

portfolioHistorySchema.index({ userId: 1, date: 1 }, { unique: true });

const PortfolioHistory = mongoose.model('PortfolioHistory', portfolioHistorySchema);

export default PortfolioHistory;