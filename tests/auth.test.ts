import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { 
  initDb, 
  authenticateUser, 
  getAllAuthUsers, 
  saveAuthUser, 
  deleteAuthUser 
} from "../src/db";

describe("String-based Dowleswaram Authentication & User Management", () => {
  let db: Database;

  beforeAll(() => {
    db = initDb(":memory:");
  });

  afterAll(() => {
    try {
      db.close();
    } catch {}
  });

  it("seeds default auth users on database initialization", () => {
    const users = getAllAuthUsers(db);
    expect(users.length).toBeGreaterThanOrEqual(9);
    const names = users.map((u) => u.name);
    expect(names).toContain("Bishop");
    expect(names).toContain("Elders Quorum");
    expect(names).toContain("Relief Society");
  });

  it("authenticates existing user using [Name] dowleswaram format or no spaces", () => {
    const res = authenticateUser(db, "Bishop dowleswaram");
    expect(res.success).toBe(true);
    expect(res.user).toBeDefined();
    expect(res.user?.name).toBe("Bishop");
    expect(res.user?.role).toBe("Bishopric");

    // No spaces test
    const resNoSpace = authenticateUser(db, "Bishopdowleswaram");
    expect(resNoSpace.success).toBe(true);
    expect(resNoSpace.user?.name).toBe("Bishop");
  });

  it("authenticates case-insensitively and handles extra spaces or no spaces", () => {
    const res = authenticateUser(db, "  elders quorum   dowleswaram  ");
    expect(res.success).toBe(true);
    expect(res.user?.name).toBe("Elders Quorum");
  });

  it("auto-registers a new leader with phone number and no spaces", () => {
    const res = authenticateUser(db, "9876543210dowleswaram");
    expect(res.success).toBe(true);
    expect(res.user?.name).toBe("9876543210");
    expect(res.user?.passkey).toBe("dowleswaram");

    const found = getAllAuthUsers(db).find((u) => u.name === "9876543210");
    expect(found).toBeDefined();
  });

  it("auto-registers a new leader when passkey is dowleswaram", () => {
    const res = authenticateUser(db, "Arnold dowleswaram");
    expect(res.success).toBe(true);
    expect(res.user?.name).toBe("Arnold");
    expect(res.user?.passkey).toBe("dowleswaram");

    const all = getAllAuthUsers(db);
    const found = all.find((u) => u.name === "Arnold");
    expect(found).toBeDefined();
  });

  it("rejects invalid logins or wrong passkey", () => {
    const res1 = authenticateUser(db, "Bishop wrongpassword");
    expect(res1.success).toBe(false);

    const res2 = authenticateUser(db, "Bishop");
    expect(res2.success).toBe(false);
    expect(res2.error).toContain("dowleswaram");
  });

  it("allows leaders to update and delete login users", () => {
    const added = saveAuthUser(db, { name: "President Sahitya", passkey: "dowleswaram", role: "Stake President" });
    expect(added.success).toBe(true);
    expect(added.user?.id).toBeDefined();

    const updated = saveAuthUser(db, { id: added.user?.id, name: "President Sahitya (Updated)", passkey: "dowleswaram", role: "Stake" });
    expect(updated.success).toBe(true);
    expect(updated.user?.name).toBe("President Sahitya (Updated)");

    const del = deleteAuthUser(db, added.user!.id);
    expect(del.success).toBe(true);
    const found = getAllAuthUsers(db).find((u) => u.id === added.user!.id);
    expect(found).toBeUndefined();
  });
});
