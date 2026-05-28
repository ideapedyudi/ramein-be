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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    const banner = Buffer.from("event-banner").toString("base64");

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
        banner,
        event_type: "online",
        label_online: "Zoom Meeting",
        url_online: "https://zoom.us/j/demo",
        payment_type: "paid",
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
    expect(response.body.data.banner).toBe(banner);
    expect(response.body.data.eventType).toBe("online");
    expect(response.body.data.event_type).toBe("online");
    expect(response.body.data.labelOnline).toBe("Zoom Meeting");
    expect(response.body.data.urlOnline).toBe("https://zoom.us/j/demo");
    expect(response.body.data.paymentType).toBe("paid");
    expect(response.body.data.visibility).toBe("private");
    expect(response.body.data.publishedBy).toBe("user");
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
      .patch(`/api/v1/events/${eventRes.body.data.id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ title: "Hijacked title" });

    expect(editRes.statusCode).toBe(403);
    expect(owner.id).not.toBe(otherUser.id);
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
      .post(`/api/v1/events/${event.body.data.id}/publish`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send();

    expect(publishRes.statusCode).toBe(200);
    expect(publishRes.body.data.isPublished).toBe(true);
    expect(publishRes.body.data.status).toBe("published");
    expect(publishRes.body.data.publishedBy).toBe("user");
  });

  test("admin-created event is public", async () => {
    await createUser({
      name: "Admin Creator",
      email: "admin.creator@test.com",
      password: "password123",
      role: "admin"
    });
    const adminToken = await login("admin.creator@test.com", "password123");

    const categoryId = await createCategory("Admin Event Category");
    const organizerId = await createOrganizer({ name: "Admin Promotor" });
    const cityId = await createCity("Denpasar");

    const response = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Admin Event",
        description: "Created by admin",
        categoryId,
        organizerId,
        cityId,
        addressDetail: "Admin venue",
        startDateTime: "2030-05-10T19:00:00.000Z",
        endDateTime: "2030-05-10T22:00:00.000Z",
        ticketTypes: [
          {
            name: "Regular",
            price: 100000,
            quota: 100,
            saleStartAt: "2030-01-10T00:00:00.000Z",
            saleEndAt: "2030-05-10T18:00:00.000Z"
          }
        ]
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.visibility).toBe("public");
  });

  test("get my events only returns events created by logged in user", async () => {
    await createUser({
      name: "List Owner A",
      email: "list-owner-a@test.com",
      password: "password123",
      role: "user"
    });
    await createUser({
      name: "List Owner B",
      email: "list-owner-b@test.com",
      password: "password123",
      role: "user"
    });

    const ownerAToken = await login("list-owner-a@test.com", "password123");
    const ownerBToken = await login("list-owner-b@test.com", "password123");

    const categoryId = await createCategory("Private Listing");
    const organizerId = await createOrganizer({ name: "Listing Organizer" });
    const cityId = await createCity("Bogor");

    await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${ownerAToken}`)
      .send({
        title: "Owner A Event",
        description: "Owned by A",
        categoryId,
        organizerId,
        cityId,
        addressDetail: "Venue A",
        startDateTime: "2030-07-10T19:00:00.000Z",
        endDateTime: "2030-07-10T22:00:00.000Z",
        ticketTypes: [
          {
            name: "Regular",
            price: 50000,
            quota: 20,
            saleStartAt: "2030-01-01T00:00:00.000Z",
            saleEndAt: "2030-07-10T18:00:00.000Z"
          }
        ]
      });

    await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${ownerBToken}`)
      .send({
        title: "Owner B Event",
        description: "Owned by B",
        categoryId,
        organizerId,
        cityId,
        addressDetail: "Venue B",
        startDateTime: "2030-08-10T19:00:00.000Z",
        endDateTime: "2030-08-10T22:00:00.000Z",
        ticketTypes: [
          {
            name: "Regular",
            price: 75000,
            quota: 25,
            saleStartAt: "2030-01-01T00:00:00.000Z",
            saleEndAt: "2030-08-10T18:00:00.000Z"
          }
        ]
      });

    const response = await request(app)
      .get("/api/v1/events/me")
      .set("Authorization", `Bearer ${ownerAToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe("Owner A Event");
    expect(response.body.data[0].createdBy).toBeDefined();
  });

  test("public get events does not require login", async () => {
    const categoryId = await createCategory("Public Event List");
    const organizerId = await createOrganizer({ name: "Public Organizer" });
    const cityId = await createCity("Bekasi");

    await createUser({
      name: "Public Admin",
      email: "public.admin@test.com",
      password: "password123",
      role: "admin"
    });
    const adminToken = await login("public.admin@test.com", "password123");

    await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Public List Event",
        description: "Visible from public list",
        categoryId,
        organizerId,
        cityId,
        addressDetail: "Public venue",
        startDateTime: "2030-09-10T19:00:00.000Z",
        endDateTime: "2030-09-10T22:00:00.000Z",
        ticketTypes: [
          {
            name: "Regular",
            price: 50000,
            quota: 20,
            saleStartAt: "2030-01-01T00:00:00.000Z",
            saleEndAt: "2030-09-10T18:00:00.000Z"
          }
        ]
      });

    const response = await request(app).get("/api/v1/events");

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test("can get trending and recommended event lists", async () => {
    await createUser({
      name: "Event Curator",
      email: "curator@test.com",
      password: "password123",
      role: "admin"
    });
    const token = await login("curator@test.com", "password123");
    await createUser({
      name: "Private Owner",
      email: "private-owner@test.com",
      password: "password123",
      role: "user"
    });
    const privateOwnerToken = await login("private-owner@test.com", "password123");

    const konserCategoryId = await createCategory("Konser");
    const seminarCategoryId = await createCategory("Seminar");
    const organizerId = await createOrganizer({ name: "Trending Promotor" });
    const cityId = await createCity("Jakarta");

    const eventSeeds = [
      { title: "Konser 1", categoryId: konserCategoryId },
      { title: "Konser 2", categoryId: konserCategoryId },
      { title: "Seminar 1", categoryId: seminarCategoryId },
      { title: "Konser 3", categoryId: konserCategoryId },
      { title: "Seminar 2", categoryId: seminarCategoryId },
      { title: "Konser 4", categoryId: konserCategoryId },
      { title: "Seminar 3", categoryId: seminarCategoryId },
      { title: "Konser 5", categoryId: konserCategoryId }
    ];

    for (const seed of eventSeeds) {
      const createRes = await request(app)
        .post("/api/v1/events")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: seed.title,
          description: `${seed.title} description`,
          categoryId: seed.categoryId,
          organizerId,
          cityId,
          addressDetail: "Main venue",
          startDateTime: "2030-06-10T19:00:00.000Z",
          endDateTime: "2030-06-10T22:00:00.000Z",
          ticketTypes: [
            {
              name: "Regular",
              price: 100000,
              quota: 50,
              saleStartAt: "2030-01-01T00:00:00.000Z",
              saleEndAt: "2030-06-10T18:00:00.000Z"
            }
          ]
        });

      if (seed.categoryId === konserCategoryId) {
        await request(app)
          .post(`/api/v1/events/${createRes.body.data.id}/publish`)
          .set("Authorization", `Bearer ${token}`)
          .send();
      }

      await wait(1100);
    }

    await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${privateOwnerToken}`)
      .send({
        title: "Private Newest Event",
        description: "Should not appear in trending",
        categoryId: konserCategoryId,
        organizerId,
        cityId,
        addressDetail: "Private venue",
        startDateTime: "2030-07-10T19:00:00.000Z",
        endDateTime: "2030-07-10T22:00:00.000Z",
        ticketTypes: [
          {
            name: "Regular",
            price: 100000,
            quota: 50,
            saleStartAt: "2030-01-01T00:00:00.000Z",
            saleEndAt: "2030-07-10T18:00:00.000Z"
          }
        ]
      });

    const trendingRes = await request(app).get("/api/v1/events/trending");
    expect(trendingRes.statusCode).toBe(200);
    expect(trendingRes.body.data).toHaveLength(8);
    expect(trendingRes.body.data[0].title).toBe("Konser 5");
    expect(trendingRes.body.data[7].title).toBe("Konser 1");
    expect(trendingRes.body.data.some((event) => event.title === "Private Newest Event")).toBe(false);
    expect(trendingRes.body.data.every((event) => event.visibility === "public")).toBe(true);

    const recommendedRes = await request(app).get("/api/v1/events/recommended");
    expect(recommendedRes.statusCode).toBe(200);
    expect(recommendedRes.body.data).toHaveLength(5);
    expect(recommendedRes.body.data.every((event) => event.category.name === "Konser")).toBe(true);
  });
});
