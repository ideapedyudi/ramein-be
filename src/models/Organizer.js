import mongoose from "mongoose";

const organizerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: null },
    contactName: { type: String, default: null },
    contactEmail: { type: String, default: null },
    contactPhone: { type: String, default: null },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Organizer", organizerSchema);
