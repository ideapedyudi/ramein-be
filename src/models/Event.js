import mongoose from "mongoose";

const ticketTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    quota: { type: Number, required: true, min: 1 },
    sold: { type: Number, default: 0, min: 0 },
    saleStartAt: { type: Date, required: true },
    saleEndAt: { type: Date, required: true }
  },
  { _id: true }
);

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "Organizer", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: "City", required: true },
    venueId: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", required: true },
    addressDetail: { type: String, required: true, trim: true },
    bannerUrl: { type: String, default: null },
    startDateTime: { type: Date, required: true },
    endDateTime: { type: Date, required: true },
    ticketTypes: { type: [ticketTypeSchema], default: [] },
    status: {
      type: String,
      enum: ["draft", "pending", "published", "rejected", "completed", "cancelled"],
      default: "draft"
    },
    isPublished: { type: Boolean, default: false }
  },
  { timestamps: true }
);

eventSchema.index({ title: "text", description: "text" });
eventSchema.index({ status: 1, startDateTime: 1 });

export default mongoose.model("Event", eventSchema);
