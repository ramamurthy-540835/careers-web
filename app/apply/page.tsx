import ApplicationForm from "./application-form";

export const dynamic = "force-dynamic";

export default function ApplyPage() {
  return (
    <ApplicationForm turnstileSiteKey={process.env.TURNSTILE_SITE_KEY || ""} />
  );
}
