import Event from "../../models/Event.js";
import Transaction from "../../models/Transaction.js";
import PaymentLog from "../../models/PaymentLog.js";
import ApiError from "../../utils/apiError.js";
import paymentService from "../payments/payment.service.js";

function generateOrderId() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${Date.now()}-${random}`;
}

function findTicketById(event, ticketTypeId) {
  return event.ticketTypes.find((ticket) => ticket._id.toString() === ticketTypeId);
}

async function createTransaction(payload, user) {
  const event = await Event.findById(payload.eventId);
  if (!event) throw new ApiError(404, "Event not found");
  if (!event.isPublished || event.status !== "published") {
    throw new ApiError(400, "Event is not available");
  }

  const now = new Date();
  const items = [];
  let grossAmount = 0;

  for (const selectedItem of payload.items) {
    const ticket = findTicketById(event, selectedItem.ticketTypeId);
    if (!ticket) throw new ApiError(400, "Invalid ticket type");
    if (now < ticket.saleStartAt || now > ticket.saleEndAt) {
      throw new ApiError(400, `Ticket ${ticket.name} is not on sale`);
    }

    const available = ticket.quota - ticket.sold;
    if (available < selectedItem.quantity) {
      throw new ApiError(400, `Insufficient quota for ticket ${ticket.name}`);
    }

    const subtotal = ticket.price * selectedItem.quantity;
    grossAmount += subtotal;
    items.push({
      ticketTypeId: ticket._id,
      ticketName: ticket.name,
      unitPrice: ticket.price,
      quantity: selectedItem.quantity,
      subtotal
    });
  }

  const orderId = generateOrderId();
  const payment = await paymentService.createMidtransTransaction({
    orderId,
    grossAmount,
    customer: user
  });

  return Transaction.create({
    orderId,
    userId: user._id,
    eventId: event._id,
    items,
    grossAmount,
    status: "pending",
    snapToken: payment.token || null,
    redirectUrl: payment.redirect_url || null
  });
}

async function getMyTransactions(userId) {
  return Transaction.find({ userId }).sort({ createdAt: -1 }).populate("eventId", "title startDateTime");
}

async function getAllTransactions(filter = {}) {
  const query = {};
  if (filter.status) query.status = filter.status;
  if (filter.eventId) query.eventId = filter.eventId;
  return Transaction.find(query)
    .sort({ createdAt: -1 })
    .populate("userId", "name email")
    .populate("eventId", "title");
}

async function handleMidtransNotification(payload) {
  if (!paymentService.verifyMidtransSignature(payload)) {
    throw new ApiError(401, "Invalid midtrans signature");
  }

  const notificationKey = `${payload.order_id}|${payload.transaction_status}|${payload.status_code}`;
  const existingLog = await PaymentLog.findOne({ notificationKey });
  if (existingLog) {
    return { duplicated: true };
  }

  await PaymentLog.create({
    orderId: payload.order_id,
    notificationKey,
    payload
  });

  const tx = await Transaction.findOne({ orderId: payload.order_id });
  if (!tx) throw new ApiError(404, "Transaction not found");

  const currentStatus = tx.status;
  const mappedStatus = paymentService.mapMidtransStatus(payload);

  tx.midtransTransactionStatus = payload.transaction_status;
  tx.status = mappedStatus;

  if (mappedStatus === "paid" && currentStatus !== "paid") {
    tx.paidAt = new Date();
    for (const item of tx.items) {
      await Event.updateOne(
        { _id: tx.eventId, "ticketTypes._id": item.ticketTypeId },
        { $inc: { "ticketTypes.$.sold": item.quantity } }
      );
    }
  }

  await tx.save();
  return { duplicated: false, status: tx.status };
}

export default {
  createTransaction,
  getMyTransactions,
  getAllTransactions,
  handleMidtransNotification
};
