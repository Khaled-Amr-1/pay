import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { createClient } from "@supabase/supabase-js";
import { Env } from "./sharedTypes";

export const auth = createMiddleware<Env>(async (c, next) => {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
    },
  });

  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "missing or invalid auth header" });
  }

  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.log(error);
    throw new HTTPException(401, {
      message: "Invalid or expired token",
    });
  }
  c.set("User", user);

  await next();
});

export default auth;
