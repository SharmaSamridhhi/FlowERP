import type { AuthUser } from "@flowerp/shared";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role, User } from "../generated/prisma/client.js";
import { UnauthorizedError } from "../utils/errors.js";
import { findUserByEmail, verifyPassword } from "./user.service.js";

interface AuthTokenPayload {
  sub: string;
  email: string;
  role: Role;
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new UnauthorizedError("Invalid email or password");
  }

  return { token: issueToken(user), user: toAuthUser(user) };
}

export function issueToken(user: Pick<User, "id" | "email" | "role">): string {
  const payload: AuthTokenPayload = { sub: user.id, email: user.email, role: user.role };
  // jsonwebtoken types expiresIn as a template-literal union (e.g. "8h"),
  // stricter than env.jwtExpiresIn's plain `string` — env.ts isn't
  // formally Zod-validated yet (that's FLO-018), so this trusts the
  // configured value is a valid duration string rather than re-deriving
  // that stricter type here.
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): AuthTokenPayload {
  try {
    return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}

export function toAuthUser(user: Pick<User, "id" | "name" | "email" | "role">): AuthUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
