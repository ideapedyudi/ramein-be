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

    const ticketListRes = await request(app)
      .get("/api/v1/ticket/me")
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(ticketListRes.statusCode).toBe(200);
    expect(ticketListRes.body.data).toHaveLength(1);
    expect(ticketListRes.body.data[0].eventId).toBe(eventId);
    expect(ticketListRes.body.data[0].transactionId).toBe(createTxRes.body.data.id);
    expect(ticketListRes.body.data[0].qrCode).toBeDefined();
    expect(ticketListRes.body.data[0].attendanceStatus).toBe("not_attended");
    expect(ticketListRes.body.data[0].event).toMatchObject({
      id: eventId,
      title: "Live Show",
      description: "Live show test",
      paymentType: "paid",
      status: "published"
    });
    expect(ticketListRes.body.data[0].event.category.name).toBe("Festival");
    expect(ticketListRes.body.data[0].event.city.name).toBe("Yogyakarta");
    expect(ticketListRes.body.data[0].event.organizer.name).toBe("Promotor Tx");
    expect(ticketListRes.body.data[0].transaction).toMatchObject({
      id: createTxRes.body.data.id,
      orderId,
      grossAmount,
      status: "paid",
      paymentProvider: "midtrans"
    });
    expect(ticketListRes.body.data[0].transaction.items).toEqual([
      {
        ticketTypeId,
        ticketName: "Regular",
        unitPrice: 120000,
        quantity: 2,
        subtotal: 240000
      }
    ]);

    const ticketIndexRes = await request(app)
      .get("/api/v1/ticket")
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(ticketIndexRes.statusCode).toBe(200);
    expect(ticketIndexRes.body.data).toHaveLength(1);
    expect(ticketIndexRes.body.data[0].id).toBe(ticketListRes.body.data[0].id);

    const allEventTicketsRes = await request(app)
      .get(`/api/v1/ticket/event-ticket/${eventId}/all`)
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(allEventTicketsRes.statusCode).toBe(200);
    expect(allEventTicketsRes.body.data).toHaveLength(1);

    const notAttendedEventTicketsRes = await request(app)
      .get(`/api/v1/ticket/event-ticket/${eventId}/tidak_hadir`)
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(notAttendedEventTicketsRes.statusCode).toBe(200);
    expect(notAttendedEventTicketsRes.body.data).toHaveLength(1);
    expect(notAttendedEventTicketsRes.body.data[0].attendanceStatus).toBe("not_attended");

    const emptyAttendedEventTicketsRes = await request(app)
      .get(`/api/v1/ticket/event-ticket/${eventId}/hadir`)
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(emptyAttendedEventTicketsRes.statusCode).toBe(200);
    expect(emptyAttendedEventTicketsRes.body.data).toHaveLength(0);

    const qrCode = ticketListRes.body.data[0].qrCode;
    const scanRes = await request(app)
      .post("/api/v1/ticket/qr-code/scan")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ qrCode });

    expect(scanRes.statusCode).toBe(200);
    expect(scanRes.body.data.attendanceStatus).toBe("attended");
    expect(scanRes.body.data.alreadyAttended).toBe(false);

    const attendedEventTicketsRes = await request(app)
      .get(`/api/v1/ticket/event-ticket/${eventId}/hadir`)
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(attendedEventTicketsRes.statusCode).toBe(200);
    expect(attendedEventTicketsRes.body.data).toHaveLength(1);
    expect(attendedEventTicketsRes.body.data[0].attendanceStatus).toBe("attended");

    const omittedStatusEventTicketsRes = await request(app)
      .get(`/api/v1/ticket/event-ticket/${eventId}`)
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(omittedStatusEventTicketsRes.statusCode).toBe(200);
    expect(omittedStatusEventTicketsRes.body.data).toHaveLength(1);

    const duplicateScanRes = await request(app)
      .post(`/api/v1/ticket/qr-code/${qrCode}/scan`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send();

    expect(duplicateScanRes.statusCode).toBe(200);
    expect(duplicateScanRes.body.data.attendanceStatus).toBe("attended");
    expect(duplicateScanRes.body.data.alreadyAttended).toBe(true);
  });
});
