import crypto from "crypto";
import request from "supertest";
import app from "../src/app.js";
import {
  createUser,
  createCategory,
  createCity,
  createOrganizer,
  getEventTickets
} from "./helpers/dbSeed.js";

async function login(email, password) {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password });
  return res.body.data.accessToken;
}

function midtransSignature({ order_id, status_code, gross_amount }) {
  const raw = `${order_id}${status_code}${gross_amount}${process.env.MIDTRANS_SERVER_KEY || ""}`;
  return crypto.createHash("sha512").update(raw).digest("hex");
}

describe("Transaction API", () => {
  test("create transaction and process paid webhook idempotently", async () => {
    await createUser({
      name: "Buyer",
      email: "buyer@test.com",
      password: "password123",
      role: "user"
    });
    await createUser({
      name: "Admin",
      email: "admin2@test.com",
      password: "password123",
      role: "admin"
    });

    const buyerToken = await login("buyer@test.com", "password123");
    const adminToken = await login("admin2@test.com", "password123");

    const categoryId = await createCategory("Festival");
    const organizerId = await createOrganizer({ name: "Promotor Tx" });
    const cityId = await createCity("Yogyakarta");

    const now = new Date();
    const saleStartAt = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const saleEndAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const startDateTime = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    const endDateTime = new Date(now.getTime() + 49 * 60 * 60 * 1000).toISOString();

    const createEventRes = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({
        title: "Live Show",
        description: "Live show test",
        categoryId,
        organizerId,
        cityId,
        addressDetail: "Near gate A",
        startDateTime,
        endDateTime,
        ticketTypes: [
          {
            name: "Regular",
            price: 120000,
            quota: 5,
            saleStartAt,
            saleEndAt
          }
        ]
      });

    const eventId = createEventRes.body.data.id;
    await request(app)
      .post(`/api/v1/events/${eventId}/publish`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send();

    const tickets = await getEventTickets(eventId);
    const ticketTypeId = tickets[0].id;

    const createTxRes = await request(app)
      .post("/api/v1/transactions")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({
        eventId,
        items: [
          {
            ticketTypeId,
            quantity: 2
          }
        ]
      });

    expect(createTxRes.statusCode).toBe(201);
    expect(createTxRes.body.data.status).toBe("pending");

    const orderId = createTxRes.body.data.orderId;
    const grossAmount = createTxRes.body.data.grossAmount;
    const status_code = "200";

    const payload = {
      order_id: orderId,
      status_code,
      gross_amount: String(grossAmount),
      transaction_status: "settlement",
      fraud_status: "accept"
    };
    payload.signature_key = midtransSignature(payload);

    const notifRes1 = await request(app)
      .post("/api/v1/payments/midtrans/notification")
      .send(payload);

    expect(notifRes1.statusCode).toBe(200);
    expect(notifRes1.body.data.duplicated).toBe(false);

    const notifRes2 = await request(app)
      .post("/api/v1/payments/midtrans/notification")
      .send(payload);

    expect(notifRes2.statusCode).toBe(200);
    expect(notifRes2.body.data.duplicated).toBe(true);

    const updatedTickets = await getEventTickets(eventId);
    expect(Number(updatedTickets[0].sold)).toBe(2);
  });
});
