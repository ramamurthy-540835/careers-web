import crypto from "crypto";
import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { applicationSchema, uploadSchema } from "@/lib/application-schema";
import { createApplication, event, safeName, signedPut } from "@/lib/google";
import { ipHash, noStore, safeError, verifyTurnstile } from "@/lib/security";

function validationFailure(error: ZodError) {
  const fieldErrors: Record<string, string> = {};
  error.issues.forEach((issue) => {
    const field = String(issue.path[0] || "application");
    if (!fieldErrors[field]) fieldErrors[field] = issue.message;
  });
  return Response.json(
    { error: "Please correct the highlighted fields.", fieldErrors },
    { status: 400, headers: noStore },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const application = applicationSchema.parse(body);
    const cv = uploadSchema.parse(body.cv);
    if (process.env.NODE_ENV === "production" && !process.env.TURNSTILE_SECRET)
      return safeError("Applications are temporarily unavailable. Please try again later.", 503);
    if (process.env.NODE_ENV === "production" && !body.turnstile_token)
      return safeError("Please complete bot verification before submitting.", 400);
    if (
      !(await verifyTurnstile(
        body.turnstile_token,
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "",
      ))
    )
      return safeError("Bot verification failed. Please try again.", 403);
    const id = crypto.randomUUID();
    const now = new Date();
    const bucketName = process.env.GCS_BUCKET || "nelture-careers-cv-dev";
    const path = `cv/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${id}/${safeName(cv.filename)}`;
    await createApplication({
      id,
      name: application.full_name,
      email: application.email,
      whatsapp: application.whatsapp,
      residence: application.country_of_residence,
      nationality: application.nationality,
      expiry: application.passport_expiry,
      postings: application.preferred_postings,
      role: application.role,
      experience: application.experience_years,
      education: application.highest_education,
      certifications: application.certifications,
      prism: application.prism_ai_experience,
      motivation: application.motivation,
      sample: application.sample_url,
      source: application.source,
      utm: application.utm,
      ipHash: ipHash(request),
      uri: `gs://${bucketName}/${path}`,
      filename: cv.filename,
      mime: cv.mime,
      size: cv.size,
    });
    await event(id, "pending_upload", "candidate");
    const [upload_url] = await signedPut(path, cv.mime, cv.size);
    return Response.json(
      { application_id: id, upload_url, gcs_path: path },
      { headers: noStore },
    );
  } catch (error) {
    if (error instanceof ZodError) return validationFailure(error);
    return safeError(
      "We could not start your application. Please try again.",
      500,
    );
  }
}
