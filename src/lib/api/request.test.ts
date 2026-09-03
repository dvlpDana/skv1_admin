import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { readJsonRequestBody } from "./request";

describe("readJsonRequestBody", () => {
  it("accepts a JSON body", async () => {
    const request = new NextRequest("http://localhost/api/admin/faqs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "Question" }),
    });
    await expect(readJsonRequestBody(request)).resolves.toContain("Question");
  });

  it("rejects an unsupported content type", async () => {
    const request = new NextRequest("http://localhost/api/admin/faqs", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "text",
    });
    await expect(readJsonRequestBody(request)).rejects.toMatchObject({
      status: 415,
    });
  });

  it("rejects malformed JSON", async () => {
    const request = new NextRequest("http://localhost/api/admin/faqs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid",
    });
    await expect(readJsonRequestBody(request)).rejects.toMatchObject({
      status: 400,
    });
  });
});
