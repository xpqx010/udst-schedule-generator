import { ObjectId } from "mongodb";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { collections, UserDocument } from "@/lib/server/collections";

export const SESSION_COOKIE = "udst_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

type SessionClaims = {
  userId: string;
  sessionVersion: number;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return new TextEncoder().encode(value);
}

export async function createSessionToken(user: { _id: ObjectId; sessionVersion: UserDocument["sessionVersion"] }) {
  return new SignJWT({ userId: user._id.toHexString(), sessionVersion: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secret());
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function sessionClaims(request: NextRequest): Promise<SessionClaims | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.userId !== "string" || typeof payload.sessionVersion !== "number") return null;
    return { userId: payload.userId, sessionVersion: payload.sessionVersion };
  } catch {
    return null;
  }
}

export async function authenticatedUser(request: NextRequest) {
  const claims = await sessionClaims(request);
  if (!claims || !ObjectId.isValid(claims.userId)) return null;
  const { users } = await collections();
  const user = await users.findOne({ _id: new ObjectId(claims.userId) });
  if (!user || user.sessionVersion !== claims.sessionVersion) return null;
  return user;
}
