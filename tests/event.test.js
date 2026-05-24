import request from "supertest";
import app from "../src/app.js";
import {
  createUser,
  createCategory,
  createCity,
  createOrganizer
} from "./helpers/dbSeed.js";

async function login(email, password) {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password });
  return res.body.data.accessToken;
}

describe("Event API", () => {
  test("user can create event", async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "Event Owner",
      email: "owner@test.com",
      password: "password123"
    });
    const token = await login("owner@test.com", "password123");

    const categoryId = await createCategory("Music");
    const organizerId = await createOrganizer({ name: "Promotor A" });
    const cityId = await createCity("Jakarta");

    const response = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Concert 1",
        description: "Awesome concert",
        categoryId,
        organizerId,
        cityId,
        addressDetail: "Main road",
        startDateTime: "2030-01-10T19:00:00.000Z",
        endDateTime: "2030-01-10T22:00:00.000Z",
        ticketTypes: [
          {
            name: "Regular",
            price: 100000,
            quota: 100,
            saleStartAt: "2029-12-01T00:00:00.000Z",
            saleEndAt: "2030-01-10T18:00:00.000Z"
          }
        ]
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.title).toBe("Concert 1");
  });

  test("user cannot edit another user's event", async () => {
    const owner = await createUser({
      name: "Owner",
      email: "owner2@test.com",
      password: "password123",
      role: "user"
    });
    const otherUser = await createUser({
      name: "Other",
      email: "other@test.com",
      password: "password123",
      role: "user"
    });

    const categoryId = await createCategory("Seminar");
    const organizerId = await createOrganizer({ name: "Promotor B" });
    const cityId = await createCity("Bandung");

    const createRes = await request(app).post("/api/v1/auth/login").send({
      email: "owner2@test.com",
      password: "password123"
    });
    const ownerToken = createRes.body.data.accessToken;

    const eventRes = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        title: "Owner Event",
        description: "Owner event desc",
        categoryId,
        organizerId,
        cityId,
        addressDetail: "Street event",
        startDateTime: "2030-03-10T19:00:00.000Z",
        endDateTime: "2030-03-10T22:00:00.000Z",
        ticketTypes: [
          {
            name: "VIP",
            price: 200000,
            quota: 10,
            saleStartAt: "2030-01-01T00:00:00.000Z",
            saleEndAt: "2030-03-10T18:00:00.000Z"
          }
        ]
      });

    const otherToken = await login("other@test.com", "password123");
    const editRes = await request(app)
      .patch(`/api/v1/events/${eventRes.body.data._id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ title: "Hijacked title" });

    expect(editRes.statusCode).toBe(403);
    expect(owner._id).not.toBe(otherUser._id);
  });

  test("admin can publish event", async () => {
    await createUser({
      name: "Admin",
      email: "admin@test.com",
      password: "password123",
      role: "admin"
    });
    const adminToken = await login("admin@test.com", "password123");

    await createUser({
      name: "Owner Publish",
      email: "owner3@test.com",
      password: "password123",
      role: "user"
    });

    const categoryId = await createCategory("Sport");
    const organizerId = await createOrganizer({ name: "Promotor C" });
    const cityId = await createCity("Surabaya");

    const event = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${(await login("owner3@test.com", "password123"))}`)
      .send({
        title: "Pending Event",
        description: "Pending",
        categoryId,
        organizerId,
        cityId,
        addressDetail: "Arena address",
        startDateTime: "2030-04-10T19:00:00.000Z",
        endDateTime: "2030-04-10T22:00:00.000Z",
        ticketTypes: [
          {
            name: "General",
            price: 150000,
            quota: 80,
            saleStartAt: "2030-01-10T00:00:00.000Z",
            saleEndAt: "2030-04-10T18:00:00.000Z"
          }
        ]
      });

    const publishRes = await request(app)
      .post(`/api/v1/events/${event.body.data._id}/publish`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send();

    expect(publishRes.statusCode).toBe(200);
    expect(publishRes.body.data.isPublished).toBe(true);
    expect(publishRes.body.data.status).toBe("published");
  });
});
