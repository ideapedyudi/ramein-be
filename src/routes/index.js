import express from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import userRoutes from "../modules/users/user.routes.js";
import masterDataRoutes from "../modules/master-data/masterData.routes.js";
import eventMeRoutes from "../modules/event-me/eventMe.routes.js";
import ticketRoutes from "../modules/ticket/ticket.routes.js";
import eventRoutes from "../modules/events/event.routes.js";
import creatorRoutes from "../modules/creator/creator.routes.js";
import transactionRoutes from "../modules/transactions/transaction.routes.js";
import paymentRoutes from "../modules/payments/payment.routes.js";
import withdrawRoutes from "../modules/withdraw/withdraw.routes.js";
import financeRoutes from "../modules/finance/finance.routes.js";
import feedbackRoutes from "../modules/feedback/feedback.routes.js";
import feedbackCreatorRoutes from "../modules/feedback-creator/feedbackCreator.routes.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "OK"
  });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/master", masterDataRoutes);
router.use("/events", eventRoutes);
router.use("/creators", creatorRoutes);
router.use("/transactions", transactionRoutes);
router.use("/payments", paymentRoutes);
router.use("/event-me", eventMeRoutes);
router.use("/ticket", ticketRoutes);
router.use("/withdraw", withdrawRoutes);
router.use("/finance", financeRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/feedback-creators", feedbackCreatorRoutes);

export default router;
