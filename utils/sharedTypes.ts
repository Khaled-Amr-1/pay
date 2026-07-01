import { User } from "@supabase/supabase-js";

type Bindings = {
  SUPABASE_URL: string;
  PUBLISHABLE_KEY: string;
  SUPABASE_SECRET_KEY: string;
  PAYMOB_SECRET_KEY: string;
  PAYMOB_PUBLIC_KEY: string;
  HMAC_SECRET: string;
};

type Variables = {
  User: User;
};

export type Env = {
  Bindings: Bindings;
  Variables: Variables;
};
