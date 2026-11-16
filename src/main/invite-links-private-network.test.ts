import { isValidRemoteApiUrl, selfHostedApiOrigin } from "@openbot/contracts/invite-links";
import { describe, expect, it } from "vitest";

// A self-hosted account service on a private network address, such as a WireGuard one, uses HTTP.
// It must count as "the one service of this client", so that the app refuses to send it the token
// of an invitation for another service.
describe("a self-hosted account service on a private network", () => {
  it("is a self-hosted origin over HTTP", () => {
    expect(selfHostedApiOrigin("http://10.77.77.2:3110")).toBe("http://10.77.77.2:3110");
    expect(selfHostedApiOrigin("https://api.example.com")).toBe("https://api.example.com");
  });

  it.each([
    "http://127.0.0.1:3100",
    "http://localhost:3100",
    "http://8.8.8.8:3110",
    "http://api.example.com",
    "https://api.openbot.run",
    undefined,
  ])("does not make %s a self-hosted origin", (value) => {
    expect(selfHostedApiOrigin(value)).toBeUndefined();
  });

  it("accepts only its own origin in an invitation", () => {
    const options = { selfHostedApiOrigin: "http://10.77.77.2:3110" };
    expect(isValidRemoteApiUrl("http://10.77.77.2:3110/", options)).toBe(true);
    expect(isValidRemoteApiUrl("http://10.77.77.3:3110/", options)).toBe(false);
    expect(isValidRemoteApiUrl("http://10.77.77.2:3110/")).toBe(false);
  });
});
