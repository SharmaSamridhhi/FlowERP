# Postman collection

`postman_collection.json` + `postman_environment.json` cover every FlowERP REST endpoint (auth, customers, products, stock movements, sales challans, purchase orders) — 66 requests across 8 folders, each with at least one saved example response, including the key error cases (validation, 401/403, 404, and both 409-with-`details` cases: insufficient stock on challan confirm, and the negative-stock guard on purchase-order cancel). See [FLO-021](../specs/FLO-021-documentation-submission.md) and the [full API surface reference](../specs/README.md).

## Import

1. Import both files into Postman (or any Postman-v2.1-compatible tool).
2. Select the **FlowERP Local** environment.
3. Start the backend (`npm run dev -w backend`, or `docker compose up` — see [docs/docker.md](docker.md)) and make sure it's reachable at the environment's `baseUrl` (defaults to `http://localhost:4000`).

## Auth flow

Run **Auth → Login — Admin** first. Its test script saves the returned JWT into the `token` collection variable, which every other request in the collection uses as its default Bearer auth — nothing else needs manual header setup. The other three `Login —` requests (Sales/Warehouse/Accounts) log in as the other seeded roles and save their tokens into `salesToken`/`warehouseToken`/`accountsToken`; those are used explicitly by the 403 Forbidden examples throughout the collection to demonstrate role enforcement with the _wrong_ role's token.

All four demo accounts share one password, held in the `demoPassword` environment variable (`FlowERP123!` by default — change it if you overrode `SEED_USER_PASSWORD`).

## Running it

Every folder after Auth is self-contained and safely **re-runnable any number of times** against the same database — write requests generate a fresh unique value (timestamp-suffixed SKUs, etc.) each run rather than reusing a fixed one, and later requests in a folder reference IDs saved by earlier ones via collection variables (e.g. "Create Customer" saves `customerId`; "Get Customer by ID" reads it back). Run folder-by-folder top to bottom, or the whole collection via Collection Runner / `newman run docs/postman_collection.json -e docs/postman_environment.json`.

The **Negative-Stock Guard Demo** folder is deliberately isolated (its own product/PO/challan) so that one scenario — cancelling a Received PO being blocked because reversing it would take stock negative — is deterministically reproducible independent of what else has run.

Verified end-to-end (twice in a row, confirming re-runnability) against a live local backend with `newman` before being committed.
