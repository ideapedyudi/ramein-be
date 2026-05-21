import mongoose from "mongoose";

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: "City", required: true },
    address: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

venueSchema.index({ name: 1, cityId: 1 }, { unique: true });

export default mongoose.model("Venue", venueSchema);
