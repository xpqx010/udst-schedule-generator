import { ObjectId } from "mongodb";
import { database } from "@/lib/server/db";

export type UserDocument = {
  email: string;
  passwordHash: string;
  sessionVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PasswordResetDocument = {
  userId: ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
};

type RateLimitDocument = {
  key: string;
  count: number;
  resetAt: Date;
};

let indexPromise: Promise<unknown> | undefined;

export async function collections() {
  const db = await database();
  const users = db.collection<UserDocument>("users");
  const passwordResets = db.collection<PasswordResetDocument>("password_resets");
  const rateLimits = db.collection<RateLimitDocument>("rate_limits");

  if (!indexPromise) {
    indexPromise = Promise.all([
      users.createIndex({ email: 1 }, { unique: true }),
      passwordResets.createIndex({ tokenHash: 1 }, { unique: true }),
      passwordResets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      rateLimits.createIndex({ key: 1 }, { unique: true }),
      rateLimits.createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 }),
    ]).catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  }
  await indexPromise;
  return { users, passwordResets, rateLimits };
}
