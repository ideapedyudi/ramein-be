import request from "supertest";
import app from "../src/app.js";
import {
  createUser,
  createCategory,
  createCity,
  createOrganizer
} from "./helpers/dbSeed.js";

async function login(email, password = "password123") {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password });
  return res.body.data.accessToken;
}

describe("Master Data API", () => {
  test("can get and edit category", async () => {
    await createUser({
      name: "Master Admin Category",
      email: "master-category@test.com",
      role: "admin"
    });
    const token = await login("master-category@test.com");
    const id = await createCategory("Old Category");

    const detailRes = await request(app).get(`/api/v1/master/categories/${id}`);
    expect(detailRes.statusCode).toBe(200);
    expect(detailRes.body.data.name).toBe("Old Category");

    const updateRes = await request(app)
      .put(`/api/v1/master/categories/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New Category", isActive: false });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data.name).toBe("New Category");
    expect(updateRes.body.data.isActive).toBe(false);
  });

  test("can edit city", async () => {
    await createUser({
      name: "Master Admin City",
      email: "master-city@test.com",
      role: "admin"
    });
    const token = await login("master-city@test.com");
    const id = await createCity("Old City", "Jawa Barat");

    const updateRes = await request(app)
      .put(`/api/v1/master/cities/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New City", provinsi: "DKI Jakarta" });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data.name).toBe("New City");
    expect(updateRes.body.data.provinsi).toBe("DKI Jakarta");
  });

  test("can edit organizer", async () => {
    await createUser({
      name: "Master Admin Organizer",
      email: "master-organizer@test.com",
      role: "admin"
    });
    const token = await login("master-organizer@test.com");
    const id = await createOrganizer({ name: "Old Organizer" });

    const updateRes = await request(app)
      .put(`/api/v1/master/organizers/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "New Organizer",
        description: "Updated organizer",
        contactName: "Admin Event",
        contactEmail: "admin.event@test.com",
        contactPhone: "08123456789"
      });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data.name).toBe("New Organizer");
    expect(updateRes.body.data.description).toBe("Updated organizer");
    expect(updateRes.body.data.contactEmail).toBe("admin.event@test.com");
  });
});
