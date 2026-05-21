import midtransClient from "midtrans-client";
import env from "./env.js";

const snap = new midtransClient.Snap({
  isProduction: env.midtransIsProduction,
  serverKey: env.midtransServerKey,
  clientKey: env.midtransClientKey
});

export {
  snap
};
