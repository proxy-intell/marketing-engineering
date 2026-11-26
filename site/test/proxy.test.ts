import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

test("other hosts 301 to marketingengineering.dev, keeping path and query", () => {
  const res = proxy(new NextRequest("https://www.marketingengineering.dev/v?t=a:daily"));
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), "https://marketingengineering.dev/v?t=a:daily");
});

test("the Host header decides, not the server's bind address", () => {
  const res = proxy(new NextRequest("http://127.0.0.1:8080/", { headers: { host: "www.marketingengineering.dev" } }));
  assert.equal(res.status, 301);
});

test("sign-in routes pass through on the canonical host and localhost, and redirect elsewhere like any path", () => {
  for (const u of ["https://marketingengineering.dev/auth/login?returnTo=%2Fv", "http://localhost:3000/auth/callback?code=a&state=b", "https://marketingengineering.dev/v1/me", "http://localhost:3000/v1/auth/device"]) {
    assert.equal(proxy(new NextRequest(u)).headers.get("x-middleware-next"), "1", u);
  }
  const res = proxy(new NextRequest("https://www.marketingengineering.dev/auth/login?returnTo=%2Fv"));
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), "https://marketingengineering.dev/auth/login?returnTo=%2Fv");
});

test("the canonical host, localhost and Cloud Run URLs pass through", () => {
  for (const u of ["https://marketingengineering.dev/", "http://localhost:3000/v1/scores", "https://me-site-abc123-ew.a.run.app/"]) {
    assert.equal(proxy(new NextRequest(u)).headers.get("x-middleware-next"), "1", u);
  }
});
