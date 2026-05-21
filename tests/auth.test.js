import request from "supertest";
import app from "../src/app.js";

describe("Auth API", () => {
  test("should create first user as admin", async () => {
    const response = await request(app).post("/api/v1/auth/first-user").send({
      name: "Initial Admin",
      email: "firstadmin@test.com",
      password: "password123"
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.role).toBe("admin");
  });

  test("should reject first-user initialization if user already exists", async () => {
    await request(app).post("/api/v1/auth/first-user").send({
      name: "Initial Admin",
      email: "firstadmin@test.com",
      password: "password123"
    });

    const response = await request(app).post("/api/v1/auth/first-user").send({
      name: "Initial Admin 2",
      email: "firstadmin2@test.com",
      password: "password123"
    });

    expect(response.statusCode).toBe(409);
    expect(response.body.success).toBe(false);
  });

  test("should register user", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      name: "User Test",
      email: "user@test.com",
      password: "password123"
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe("user@test.com");
  });

  test("should reject duplicate email", async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "User Test",
      email: "user@test.com",
      password: "password123"
    });

    const response = await request(app).post("/api/v1/auth/register").send({
      name: "User Test 2",
      email: "user@test.com",
      password: "password123"
    });

    expect(response.statusCode).toBe(409);
    expect(response.body.success).toBe(false);
  });

  test("should login user", async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "User Login",
      email: "login@test.com",
      password: "password123"
    });

    const response = await request(app).post("/api/v1/auth/login").send({
      email: "login@test.com",
      password: "password123"
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
  });
});
