import request from "supertest";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Category from "../src/models/Category.js";
import City from "../src/models/City.js";
import Venue from "../src/models/Venue.js";
import Organizer from "../src/models/Organizer.js";

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

    const category = await Category.create({ name: "Music" });
    const organizer = await Organizer.create({ name: "Promotor A" });
    const city = await City.create({ name: "Jakarta" });
    const venue = await Venue.create({ name: "Stadium", cityId: city._id, address: "Street 1" });

    const response = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Concert 1",
        description: "Awesome concert",
        categoryId: category._id.toString(),
        organizerId: organizer._id.toString(),
        cityId: city._id.toString(),
        venueId: venue._id.toString(),
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
    const owner = await User.create({
      name: "Owner",
      email: "owner2@test.com",
      password: "password123",
      role: "user"
    });
    const otherUser = await User.create({
      name: "Other",
      email: "other@test.com",
      password: "password123",
      role: "user"
    });

    const category = await Category.create({ name: "Seminar" });
    const organizer = await Organizer.create({ name: "Promotor B" });
    const city = await City.create({ name: "Bandung" });
    const venue = await Venue.create({ name: "Hall", cityId: city._id, address: "Street 2" });

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
        categoryId: category._id.toString(),
        organizerId: organizer._id.toString(),
        cityId: city._id.toString(),
        venueId: venue._id.toString(),
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
    expect(owner._id.toString()).not.toBe(otherUser._id.toString());
  });

  test("admin can publish event", async () => {
    const admin = await User.create({
      name: "Admin",
      email: "admin@test.com",
      password: "password123",
      role: "admin"
    });
    await admin.save();
    const adminToken = await login("admin@test.com", "password123");

    const owner = await User.create({
      name: "Owner Publish",
      email: "owner3@test.com",
      password: "password123",
      role: "user"
    });

    const category = await Category.create({ name: "Sport" });
    const organizer = await Organizer.create({ name: "Promotor C" });
    const city = await City.create({ name: "Surabaya" });
    const venue = await Venue.create({ name: "Arena", cityId: city._id, address: "Street 3" });

    const event = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${(await login("owner3@test.com", "password123"))}`)
      .send({
        title: "Pending Event",
        description: "Pending",
        categoryId: category._id.toString(),
        organizerId: organizer._id.toString(),
        cityId: city._id.toString(),
        venueId: venue._id.toString(),
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
