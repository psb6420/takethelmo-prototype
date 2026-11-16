import { afterEach, describe, expect, it } from "vitest";
import { LocalAuthStore } from "./database";
let store: LocalAuthStore;
afterEach(() => store?.db.close());
describe("local account authentication", () => {
  it("normalizes email, hashes passwords and prevents duplicate accounts", () => {
    store = new LocalAuthStore(":memory:");
    const user = store.register("연구자 A", " A@example.com ", "test-password-123");
    expect(user.email).toBe("a@example.com");
    expect(store.login("A@example.com", "test-password-123").id).toBe(user.id);
    expect(() => store.login(user.email, "wrong-password")).toThrow();
    expect(() => store.register("연구자 B", user.email, "test-password-123")).toThrow();
    expect(store.db.prepare("SELECT password_hash FROM local_users").get()?.password_hash).not.toBe("test-password-123");
  });
  it("rejects forged, expired, revoked and inactive sessions", () => {
    store = new LocalAuthStore(":memory:");
    const user = store.register("연구자 A", "a@example.com", "test-password-123");
    const token = store.session(user);
    expect(store.user(token)?.id).toBe(user.id);
    expect(store.user("f".repeat(64))).toBeNull();
    store.logout(token); expect(store.user(token)).toBeNull();
    const expired = store.session(user);
    store.db.exec("UPDATE local_sessions SET expires_at=0"); expect(store.user(expired)).toBeNull();
    const disabled = store.session(user);
    store.db.exec("UPDATE local_users SET active=0"); expect(store.user(disabled)).toBeNull();
    expect(() => store.login(user.email, "test-password-123")).toThrow();
  });
  it("limits repeated attempts", () => {
    store = new LocalAuthStore(":memory:");
    store.attempt("account", 1);
    expect(() => store.attempt("account", 1)).toThrow("15분");
  });
});
