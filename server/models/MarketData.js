import mongoose from 'mongoose';

const marketDataSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    assetType: {
      type: String,
      enum: ['equity', 'gold', 'debt'],
      required: true,
    },
    price: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      min: 0,
    },
    changePercent: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    source: {
      type: String,
      enum: ['simulation'],
      default: 'simulation',
      required: true,
    },
  },
  { timestamps: true }
);

const MarketData = mongoose.model('MarketData', marketDataSchema);

export default MarketData;
