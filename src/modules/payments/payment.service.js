import crypto from "crypto";
import { snap } from "../../config/midtrans.js";
import env from "../../config/env.js";
import ApiError from "../../utils/apiError.js";

async function createMidtransTransaction({ orderId, grossAmount, customer }) {
  if (env.nodeEnv === "test" || !env.midtransServerKey) {
    return {
      token: `dummy-token-${orderId}`,
      redirect_url: `${env.appBaseUrl}/dummy-payment/${orderId}`
    };
  }

  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount
    },
    customer_details: {
      first_name: customer.name,
      email: customer.email,
      phone: customer.phone || ""
    }
  };

  try {
    return await snap.createTransaction(parameter);
  } catch (error) {
    const message = error?.ApiResponse?.error_messages?.[0] || error?.message || "Midtrans request failed";
    if (String(message).toLowerCase().includes("unauthorized transaction")) {
      throw new ApiError(
        401,
        "Midtrans unauthorized: cek MIDTRANS_SERVER_KEY, MIDTRANS_CLIENT_KEY, dan MIDTRANS_IS_PRODUCTION (sandbox=false, production=true)."
      );
    }
    throw new ApiError(502, `Midtrans error: ${message}`);
  }
}

function verifyMidtransSignature(payload) {
  const raw = `${payload.order_id}${payload.status_code}${payload.gross_amount}${env.midtransServerKey}`;
  const expectedSignature = crypto.createHash("sha512").update(raw).digest("hex");
  return expectedSignature === payload.signature_key;
}

function mapMidtransStatus(payload) {
  const status = payload.transaction_status;
  const fraud = payload.fraud_status;

  if (status === "capture") {
    return fraud === "accept" ? "paid" : "pending";
  }
  if (status === "settlement") return "paid";
  if (status === "pending") return "pending";
  if (status === "expire") return "expired";
  if (status === "cancel") return "cancelled";
  if (status === "deny") return "failed";
  if (status === "refund" || status === "partial_refund") return "refunded";
  return "pending";
}

export default {
  createMidtransTransaction,
  verifyMidtransSignature,
  mapMidtransStatus
};
