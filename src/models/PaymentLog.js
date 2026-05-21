import mongoose from "mongoose";

const paymentLogSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, index: true },
    source: { type: String, default: "midtrans" },
    notificationKey: { type: String, required: true, unique: true },
    payload: { type: Object, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("PaymentLog", paymentLogSchema);
