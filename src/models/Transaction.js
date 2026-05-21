import mongoose from "mongoose";

const transactionItemSchema = new mongoose.Schema(
  {
    ticketTypeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    ticketName: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    items: { type: [transactionItemSchema], default: [] },
    grossAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "expired", "cancelled", "refunded"],
      default: "pending"
    },
    paymentProvider: { type: String, default: "midtrans" },
    snapToken: { type: String, default: null },
    redirectUrl: { type: String, default: null },
    midtransTransactionStatus: { type: String, default: null },
    paidAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);
