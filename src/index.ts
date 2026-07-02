import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { auth } from "../utils/auth";
import { Env } from "../utils/sharedTypes";
import { createClient } from "@supabase/supabase-js";
const app = new Hono<Env>();

app.post("/pay", auth, async (c) => {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
    },
  });

  const { firstName, lastName, phone, id } = await c.req.json();
  if (!firstName || !lastName || !phone || !id) {
    throw new HTTPException(400, {
      message: "Missing required fields in the request body",
    });
  }
  const email = c.get("User").email;
  const userId = c.get("User").id;
  const billingData = { firstName, lastName, phone };

  const { data, error: getProductError } = await supabase
    .from("products")
    .select("price")
    .eq("id", id)
    .single();

  if (getProductError) {
    console.error(getProductError);
    throw new HTTPException(500, { message: "Internal Database Error" });
  }

  const price = data.price;

  const intnetResponse = await fetch(
    "https://accept.paymob.com/v1/intention/",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${c.env.PAYMOB_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: price,
        currency: "EGP",
        payment_methods: ["card"],
        billing_data: {
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone_number: phone,
        },
      }),
    },
  );
  if (!intnetResponse.ok) {
    const paymobError = await intnetResponse.text();
    console.error(paymobError);
    throw new HTTPException(502, { message: "Paymob Currently unavailabe" });
  }
  const { intention_order_id, client_secret } = await intnetResponse.json();

  const { error: insertProductError } = await supabase.from("orders").insert({
    user_id: userId,
    billing_data: billingData,
    paymob_order_id: intention_order_id,
    status: "PaymentPending",
  });

  if (insertProductError) {
    console.error(insertProductError);
    throw new HTTPException(500, { message: "Internal Database Error" });
  }

  return c.json({
    data: {
      clientSecret: client_secret,
      publicKey: c.env.PAYMOB_PUBLIC_KEY,
    },
  });
});

app.post("/webhook", async (c) => {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
    },
  });
  const hmac = c.req.query("hmac");
  const { obj } = await c.req.json();
  const hmacData = {
    id: obj.id,
    amount_cents: obj.amount_cents,
    currency: obj.currency,
    error_occured: obj.error_occured,
    has_parent_transaction: obj.has_parent_transaction,
    is_3d_secure: obj.is_3d_secure,
    is_auth: obj.is_auth,
    is_capture: obj.is_capture,
    is_refunded: obj.is_refunded,
    is_standalone_payment: obj.is_standalone_payment,
    is_voided: obj.is_voided,
    owner: obj.owner,
    pending: obj.pending,
    success: obj.success,
    created_at: obj.created_at,
    "source_data.pan": obj.source_data?.pan,
    "source_data.type": obj.source_data?.type,
    "source_data.sub_type": obj.source_data?.sub_type,
    integration_id: obj.payment_key_claims?.integration_id,
    "order.id": obj.order?.id,
  };

  const hmacString = Object.keys(hmacData)
    .sort()
    .map((x) => hmacData[x as keyof typeof hmacData])
    .join("");

  const encoder = new TextEncoder();
  const encodedData = encoder.encode(hmacString);

  const key = c.env.HMAC_SECRET;
  const keyData = encoder.encode(key);

  const finalKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );

  const calculatedHmac = await crypto.subtle.sign(
    "HMAC",
    finalKey,
    encodedData,
  );
  const finalHmac = new Uint8Array(calculatedHmac).toHex();

  if (hmac === finalHmac) {
    let newOrderStatus = "PaymentFailed";

    if (hmacData.success) {
      newOrderStatus = "PaymentReceived";
    } else if (hmacData.pending) {
      newOrderStatus = "PaymentPending";
    } else {
      newOrderStatus = "PaymentFailed";
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: newOrderStatus })
      .eq("paymob_order_id", hmacData["order.id"]);
    if (error) {
      console.error(error);
      throw new HTTPException(500, { message: "Internal Database Error" });
    }
  } else {
    throw new HTTPException(401, { message: "not authorized" });
  }
});

export default app;
