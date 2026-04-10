import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

async function proxyRequest(request: NextRequest) {
  const path = request.nextUrl.pathname.replace("/api/", "/api/v1/");
  const url = `${BACKEND_URL}${path}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const res = await fetch(url, {
    method: request.method,
    headers,
    body: request.method !== "GET" ? await request.text() : undefined,
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: res.headers,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
