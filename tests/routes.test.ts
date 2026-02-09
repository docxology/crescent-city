import { describe, expect, test } from "bun:test";
import { handleApiRoute } from "../src/gui/routes";

describe("handleApiRoute", () => {
    test("returns 404 for unknown API path", async () => {
        const url = new URL("http://localhost:3000/api/unknown-endpoint");
        const response = await handleApiRoute(url);
        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.error).toBe("Not found");
    });

    test("sets JSON Content-Type header", async () => {
        const url = new URL("http://localhost:3000/api/unknown-endpoint");
        const response = await handleApiRoute(url);
        expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    test("sets CORS header", async () => {
        const url = new URL("http://localhost:3000/api/unknown-endpoint");
        const response = await handleApiRoute(url);
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    test("/api/search with empty query returns empty results", async () => {
        const url = new URL("http://localhost:3000/api/search?q=");
        const response = await handleApiRoute(url);
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.query).toBe("");
        expect(body.count).toBe(0);
        expect(body.results).toEqual([]);
    });

    test("/api/chat with empty question returns 400", async () => {
        const url = new URL("http://localhost:3000/api/chat?q=");
        const response = await handleApiRoute(url);
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toContain("No question provided");
    });

    test("/api/article/:guid returns 404 for nonexistent article", async () => {
        const url = new URL("http://localhost:3000/api/article/nonexistent-guid-00000");
        const response = await handleApiRoute(url);
        expect(response.status).toBe(404);
    });

    test("/api/section/:guid returns 404 for nonexistent section", async () => {
        const url = new URL("http://localhost:3000/api/section/nonexistent-guid-00000");
        const response = await handleApiRoute(url);
        expect(response.status).toBe(404);
    });
});
