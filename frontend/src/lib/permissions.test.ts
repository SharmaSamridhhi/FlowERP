import { describe, expect, it } from "vitest";
import { canWrite, describeRoles, writeDeniedTitle } from "./permissions";

describe("canWrite", () => {
  it("returns true when the role is permitted to write to the resource", () => {
    expect(canWrite("ADMIN", "customers")).toBe(true);
    expect(canWrite("SALES", "customers")).toBe(true);
    expect(canWrite("WAREHOUSE", "products")).toBe(true);
  });

  it("returns false when the role is not permitted to write to the resource", () => {
    expect(canWrite("WAREHOUSE", "customers")).toBe(false);
    expect(canWrite("ACCOUNTS", "products")).toBe(false);
    expect(canWrite("SALES", "purchaseOrders")).toBe(false);
  });

  it("returns false for a null or undefined role", () => {
    expect(canWrite(null, "customers")).toBe(false);
    expect(canWrite(undefined, "customers")).toBe(false);
  });
});

describe("describeRoles", () => {
  it("joins role labels with 'and'", () => {
    expect(describeRoles(["ADMIN", "SALES"])).toBe("Admin and Sales");
  });
});

describe("writeDeniedTitle", () => {
  it("names the roles permitted to perform the action", () => {
    expect(writeDeniedTitle("products")).toBe("Only Admin and Warehouse can do this.");
  });
});
