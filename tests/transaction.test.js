import crypto from "crypto";
import request from "supertest";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Category from "../src/models/Category.js";
import City from "../src/models/City.js";
import Venue from "../src/models/Venue.js";
import Event from "../src/models/Event.js";
import Organizer from "../src/models/Organizer.js";

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
    await User.create({
      name: "Buyer",
      email: "buyer@test.com",
      password: "password123",
      role: "user"
    });
    await User.create({
      name: "Admin",
      email: "admin2@test.com",
      password: "password123",
      role: "admin"
    });

    const buyerToken = await login("buyer@test.com", "password123");
    const adminToken = await login("admin2@test.com", "password123");

    const category = await Category.create({ name: "Festival" });
    const organizer = await Organizer.create({ name: "Promotor Tx" });
    const city = await City.create({ name: "Yogyakarta" });
    const venue = await Venue.create({ name: "Field", cityId: city._id, address: "Jl. Malioboro" });

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
        categoryId: category._id.toString(),
        organizerId: organizer._id.toString(),
        cityId: city._id.toString(),
        venueId: venue._id.toString(),
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

    const eventId = createEventRes.body.data._id;
    await request(app)
      .post(`/api/v1/events/${eventId}/publish`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send();

    const eventDoc = await Event.findById(eventId);
    const ticketTypeId = eventDoc.ticketTypes[0]._id.toString();

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

    const updatedEvent = await Event.findById(eventId);
    expect(updatedEvent.ticketTypes[0].sold).toBe(2);
  });
});
