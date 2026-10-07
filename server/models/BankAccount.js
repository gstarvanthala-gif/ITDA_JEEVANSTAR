import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
      default: 'MicroGrow Demo Bank',
    },
    maskedAccountNumber: {
      type: String,
      required: true,
    },
    virtualBalance: {
      type: Number,
      required: true,
      min: 0,
      default: 10000,
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected'],
      default: 'connected',
    },
  },
  { timestamps: true }
);

const BankAccount = mongoose.model('BankAccount', bankAccountSchema);

export default BankAccount;