import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../src/index";

let mockDbResponse = { data: { price: 1000 }, error: null as any };
let mockInsertResponse = { error: null as any };

vi.mock("../utils/auth", () => ({
  auth: async (c: any, next: any) => {
    c.set("User", { id: "user_1", email: "test@domain.com" });
    await next();
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ single: async () => mockDbResponse }) }),
      insert: async () => mockInsertResponse,
      update: () => ({ eq: async () => ({ error: null }) }),
    })),
  })),
}));

const MOCK_ENV = {
  SUPABASE_URL: "url",
  SUPABASE_SECRET_KEY: "key",
  PAYMOB_SECRET_KEY: "pm_secret",
  PAYMOB_PUBLIC_KEY: "pm_pub",
  HMAC_SECRET: "my_secret",
};

describe("Payment API & Webhook", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("Should process payment successfully and return clientSecret", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        intention_order_id: "ord_123",
        client_secret: "secret_abc",
      }),
    } as Response);

    const validPayload = {
      firstName: "Ali",
      lastName: "Dev",
      phone: "0100",
      id: "prod_1",
    };

    const res = await app.request(
      "/pay",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      },
      MOCK_ENV,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.clientSecret).toBe("secret_abc");
  });

  it("Should decline payment if required fields are missing", async () => {
    const invalidPayload = { firstName: "Ali", lastName: "Dev", phone: "0100" };

    const res = await app.request(
      "/pay",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidPayload),
      },
      MOCK_ENV,
    );

    expect(res.status).toBe(400);
  });

  it("Should reject webhook with 401 if HMAC is invalid (Hacker simulation)", async () => {
    const fakeWebhookData = {
      obj: { id: 999, amount_cents: 1000, success: true },
    };

    const res = await app.request(
      "/webhook?hmac=fake_invalid_hmac_string",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fakeWebhookData),
      },
      MOCK_ENV,
    );

    expect(res.status).toBe(401);
  });
});
