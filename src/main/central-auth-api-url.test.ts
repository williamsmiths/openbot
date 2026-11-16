import { describe, expect, it } from "vitest";
import { readCentralAuthApiUrl } from "./central-auth-manager";

describe("readCentralAuthApiUrl", () => {
  it.each([
    ["https://api.openbot.run", "https://api.openbot.run"],
    ["http://127.0.0.1:3100", "http://127.0.0.1:3100"],
    ["http://localhost:3100/", "http://localhost:3100"],
    // An account service on a private network, such as a WireGuard address.
    ["http://10.77.77.2:3110", "http://10.77.77.2:3110"],
    ["http://172.16.0.5:3110", "http://172.16.0.5:3110"],
    ["http://192.168.1.20:3110", "http://192.168.1.20:3110"],
  ])("accepts %s", (value, origin) => {
    expect(readCentralAuthApiUrl(value)).toBe(origin);
  });

  it.each([
    "http://8.8.8.8:3110",
    "http://172.32.0.5:3110",
    "http://api.example.com",
    "http://10.77.77.2.example.com",
    "https://api.example.com/path",
    "ws://10.77.77.2:3110",
  ])("refuses %s", (value) => {
    expect(() => readCentralAuthApiUrl(value)).toThrow("OPENBOT_AUTH_API_URL must be HTTPS");
  });

  it("uses the fallback when no value is set", () => {
    expect(readCentralAuthApiUrl(undefined, "https://api.openbot.run")).toBe("https://api.openbot.run");
  });
});
