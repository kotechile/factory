import { createClient } from "./server";
import type { User, Session } from "@supabase/supabase-js";

export interface Subscription {
  id?: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id?: string;
  status: "active" | "trialing" | "canceled" | "incomplete" | "past_due" | "unpaid";
  plan: string;
  current_period_end?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Gets current authenticated user from server session.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Gets current session from server.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session;
}

/**
 * Requires user authentication or throws an explicit Error.
 */
export async function requireAuth(): Promise<User> {
  const user = await getUser();
  if (!user) {
    throw new Error("Authentication required: No authenticated user session found.");
  }
  return user;
}

/**
 * Retrieves the subscription record for a specific user.
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Row not found
      return null;
    }
    throw new Error(`Failed to fetch subscription for user ${userId}: ${error.message}`);
  }

  return data as Subscription;
}
