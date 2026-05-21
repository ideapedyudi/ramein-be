import mongoose from "mongoose";
import env from "./env.js";

async function connectDatabase() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongodbUri);
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

export {
  connectDatabase,
  disconnectDatabase
};
