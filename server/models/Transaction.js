import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
      required: true,
    },
    merchant: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    category: {
      type: String,
      required: true,
      enum: ['food', 'transport', 'groceries', 'dining', 'fuel', 'other'],
    },
    transactionDate: {
      type: Date,
      required: true,
    },
    source: {
      type: String,
      enum: ['demo'],
      default: 'demo',
      required: true,
    },
    syncKey: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, source: 1, syncKey: 1 }, { unique: true });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;