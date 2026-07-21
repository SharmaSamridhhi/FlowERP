// Entity-agnostic "unique constraint + retry" document-numbering helper,
// extracted from FLO-015's original challan-number generation so
// FLO-017 (purchase orders) doesn't reimplement the same race-safe
// pattern. See specs/FLO-015-sales-challan-backend.md and
// specs/FLO-017-purchase-order.md's Implementation Notes.
//
// A date-scoped sequence (e.g. `CH-2026-000123`) is generated
// optimistically from the current max for the given prefix; the entity's
// own unique constraint on its number column is the actual race guard —
// a collision under concurrent creates surfaces as Prisma's P2002, which
// createWithUniqueDocumentNumber retries with a freshly-read number. No
// DB sequence/migration needed for a single counter.

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Error && "code" in err && (err as { code: unknown }).code === "P2002";
}

export async function generateNextDocumentNumber(
  prefix: string,
  findLatestNumber: (prefix: string) => Promise<string | null>,
): Promise<string> {
  const latest = await findLatestNumber(prefix);
  const nextSeq = latest ? Number.parseInt(latest.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(6, "0")}`;
}

const DEFAULT_MAX_ATTEMPTS = 5;

export async function createWithUniqueDocumentNumber<T>(options: {
  prefix: string;
  findLatestNumber: (prefix: string) => Promise<string | null>;
  attemptInsert: (documentNumber: string) => Promise<T>;
  maxAttempts?: number;
}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const documentNumber = await generateNextDocumentNumber(
      options.prefix,
      options.findLatestNumber,
    );
    try {
      return await options.attemptInsert(documentNumber);
    } catch (err) {
      if (isUniqueConstraintError(err) && attempt < maxAttempts - 1) {
        continue;
      }
      throw err;
    }
  }
  /* istanbul ignore next -- unreachable: the loop above always returns or throws */
  throw new Error("Could not generate a unique document number");
}
