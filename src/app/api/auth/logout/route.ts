import { NextRequest } from "next/server";
import { noStoreJson } from "@/lib/api/route-response";
import { assertSameOriginMutation, CsrfError } from "@/lib/auth/csrf";
import { clearAdminSessionCookies } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    assertSameOriginMutation(request);
  } catch (error) {
    if (error instanceof CsrfError) {
      return noStoreJson({ message: error.message }, { status: 403 });
    }
    throw error;
  }

  const response = noStoreJson({ result: "success" });
  clearAdminSessionCookies(response);
  return response;
}
