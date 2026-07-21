// Must be the first import — config/env.ts (imported transitively via
// app.ts) reads process.env at module-load time, so .env has to be
// loaded before that happens. Only the Prisma CLI (via prisma.config.ts)
// loaded .env before now; nothing required a real value until JWT_SECRET.
import "dotenv/config";
import app from "./app.js";
import { env } from "./config/env.js";

app.listen(env.port, () => {
  console.log(`FlowERP backend listening on port ${env.port}`);
});
