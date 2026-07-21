import { PrismaClient } from "../generated/prisma/client.js";

// Single shared instance, reused across every service — never
// `new PrismaClient()` per file, which would exhaust connections.
export const prisma = new PrismaClient();
