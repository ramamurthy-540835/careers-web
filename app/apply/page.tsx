"use client";
import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applicationSchema, type ApplicationInput } from "@/lib/schema";
import { useRouter } from "next/navigation";
const defaults: any = {
  preferred_postings: [],
  certifications: [
    {
      provider: "Google Cloud",
      name: "",
      credential_id: "",
      verify_url: "",
      expiry: "",
    },
  ],
  prism_ai_experience: "none",
  experience_years: 0,
  highest_education: "bachelors",
  source: "linkedin",
  utm: {},
};
export default function Apply() {
  const router = useRouter(),
    [step, setStep] = useState(1),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const {
    register,
    watch,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: defaults,
    mode: "onChange",
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "certifications",
  });
  useEffect(() => {
    const saved = localStorage.getItem("nelture-apply");
    if (saved) Object.assign(defaults, JSON.parse(saved));
  }, []);
  useEffect(() => {
    const s = watch((v) =>
      localStorage.setItem("nelture-apply", JSON.stringify(v)),
    );
    return () => s.unsubscribe();
  }, [watch]);
  const passport = watch("passport_valid"),
    travel = watch("willing_to_travel");
  async function submit(data: ApplicationInput) {
    if (!file) return setError("Please attach your CV.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...data,
          cv: { filename: file.name, mime: file.type, size: file.size },
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error);
      const up = await fetch(out.upload_url, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!up.ok) throw new Error("Upload failed. Please try again.");
      const done = await fetch(
        `/api/applications/${out.application_id}/complete`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            mime: file.type,
            size: file.size,
            gcs_path: out.gcs_path,
          }),
        },
      );
      const final = await done.json();
      if (!done.ok) throw new Error(final.error);
      localStorage.removeItem("nelture-apply");
      router.push(`/apply/success/${out.application_id}`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="text-4xl">Apply to NELTURE</h1>
      <p className="my-4" aria-live="polite">
        Step {step} of 4
      </p>
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        {step === 1 && (
          <>
            <Input
              r={register("full_name")}
              l="Full name"
              e={errors.full_name?.message}
            />
            <Input r={register("email")} l="Email" e={errors.email?.message} />
            <Input
              r={register("whatsapp")}
              l="WhatsApp (E.164)"
              e={errors.whatsapp?.message}
            />
            <Input
              r={register("country_of_residence")}
              l="Country of residence (ISO code)"
              e={errors.country_of_residence?.message}
            />
            <Input
              r={register("nationality")}
              l="Nationality (ISO code)"
              e={errors.nationality?.message}
            />
          </>
        )}
        {step === 2 && (
          <>
            <Check r={register("passport_valid")} l="I hold a valid passport" />
            {passport === false && (
              <p className="text-red-700">
                A valid passport is mandatory for every NELTURE role. You can
                return and apply once you have one.
              </p>
            )}
            <Input
              r={register("passport_expiry")}
              l="Passport expiry"
              type="date"
              max="9999-12-31"
              e={errors.passport_expiry?.message}
            />
            <Check
              r={register("willing_to_travel")}
              l="I am willing to be posted on site at UN project locations worldwide, outside my home country"
            />
            {travel === false && (
              <p className="text-red-700">
                All roles are on-site at UN project locations. We do not have
                remote options.
              </p>
            )}
          </>
        )}
        {step === 3 && (
          <>
            <label>
              Role
              <select className="field" {...register("role")}>
                <option value="">Choose</option>
                {[
                  "climate_scientist",
                  "ai_engineer",
                  "data_engineer",
                  "gis_specialist",
                  "science_writer",
                  "project_coordinator",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <Input
              r={register("experience_years")}
              l="Years of experience"
              type="number"
            />
            <label>
              Education
              <select className="field" {...register("highest_education")}>
                {[
                  "secondary",
                  "diploma",
                  "bachelors",
                  "masters",
                  "doctorate",
                  "other",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <p>
              A recognised professional certification is mandatory. Google Cloud
              certifications are preferred for engineering roles.
            </p>
            {fields.map((f, i) => (
              <div className="card" key={f.id}>
                <Input
                  r={register(`certifications.${i}.name`)}
                  l="Certification name"
                />
                <label>
                  Provider
                  <select
                    className="field"
                    {...register(`certifications.${i}.provider`)}
                  >
                    {[
                      "Google Cloud",
                      "AWS",
                      "Microsoft Azure",
                      "PMI",
                      "ISO/IEC 42001 Lead",
                      "IPCC/UN training (specify)",
                      "University/Research (specify)",
                      "Other",
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                {i > 0 && (
                  <button type="button" onClick={() => remove(i)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => append(defaults.certifications[0])}
            >
              Add certification
            </button>
            <div className="card">
              <p>
                Prism AI is NELTURE&apos;s governed AI platform. Every project
                runs on it: approval gates, audit trails, multi-model routing.
              </p>
              <Check
                r={register("prism_ai_ready")}
                l="I confirm I am ready to work on the Prism AI platform and complete its onboarding certification within my first 30 days."
              />
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <label>
              Motivation
              <textarea
                className="field min-h-40"
                {...register("motivation")}
              />
              {errors.motivation?.message && (
                <span className="text-red-700">{errors.motivation.message}</span>
              )}
            </label>
            <Input r={register("sample_url")} l="Sample URL (optional)" />
            <label>
              CV PDF or DOCX (max 10 MB)
              <input
                className="field"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            <Check
              r={register("consent_dpdp")}
              l="I consent to collection and use as described in the privacy notice."
            />
            <Check
              r={register("consent_contact")}
              l="I agree to be contacted by email or WhatsApp."
            />
          </>
        )}{" "}
        {error && (
          <p className="text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            className="btn"
            type="button"
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
          >
            Back
          </button>
          {step < 4 ? (
            <button
              className="btn"
              type="button"
              disabled={step === 2 && (!passport || !travel)}
              onClick={() => setStep(step + 1)}
            >
              Continue
            </button>
          ) : (
            <button className="btn" disabled={busy}>
              {busy ? "Submitting…" : "Submit application"}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
function Input({ r, l, e, type = "text", ...props }: any) {
  return (
    <label className="block">
      {l}
      <input className="field" type={type} {...r} {...props} />
      {e && <span className="text-red-700">{e}</span>}
    </label>
  );
}
function Check({ r, l }: any) {
  return (
    <label className="flex gap-2 items-start">
      <input className="mt-1 h-5 w-5" type="checkbox" {...r} />
      <span>{l}</span>
    </label>
  );
}
