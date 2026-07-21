import { z } from "zod";

// Mirrors the Prisma `Role` enum (backend/prisma/schema/user.prisma).
// Kept in sync manually — packages/shared can't import from Prisma.
export const RoleSchema = z.enum(["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"]);
export type Role = z.infer<typeof RoleSchema>;

export const AuthUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: RoleSchema,
});
export type AuthUser = z.infer<typeof AuthUserSchema>;
