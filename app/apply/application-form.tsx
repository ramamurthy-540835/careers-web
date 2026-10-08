"use client";
import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  applicationSchema,
  applicationStepSchemas,
  type ApplicationInput,
} from "@/lib/application-schema";
import { useRouter } from "next/navigation";
import { countries, resolveCountryCode } from "@/lib/countries";
import { countryCallingCode, normalizeWhatsApp } from "@/lib/phone";
import TurnstileWidget from "./turnstile-widget";
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
const draftKey = "nelture-application-draft";
const fieldStep: Record<string, number> = {
  full_name: 1,
  email: 1,
  whatsapp: 1,
  country_of_residence: 1,
  nationality: 1,
  passport_valid: 2,
  passport_expiry: 2,
  willing_to_travel: 2,
  role: 3,
  experience_years: 3,
  highest_education: 3,
  certifications: 3,
  prism_ai_ready: 3,
  motivation: 4,
  sample_url: 4,
  consent_dpdp: 4,
  consent_contact: 4,
};
export default function ApplicationForm({
  turnstileSiteKey,
}: {
  turnstileSiteKey: string;
}) {
  const router = useRouter(),
    [step, setStep] = useState(1),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [turnstileToken, setTurnstileToken] = useState(""),
    [turnstileError, setTurnstileError] = useState(""),
    [turnstileResetKey, setTurnstileResetKey] = useState(0),
    [hydrated, setHydrated] = useState(false);
  const {
    register,
    watch,
    handleSubmit,
    control,
    getValues,
    reset,
    setValue,
    setError: setFieldError,
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
    try {
      const saved = sessionStorage.getItem(draftKey);
      if (saved) reset({ ...defaults, ...JSON.parse(saved) });
    } catch {
      sessionStorage.removeItem(draftKey);
    }
    setHydrated(true);
  }, [reset]);
  useEffect(() => {
    if (!hydrated) return;
    const s = watch((v) => sessionStorage.setItem(draftKey, JSON.stringify(v)));
    return () => s.unsubscribe();
  }, [watch, hydrated]);
  const passport = watch("passport_valid"),
    travel = watch("willing_to_travel");
  function showFieldErrors(fieldErrors: Record<string, string>) {
    const fields = Object.keys(fieldErrors);
    fields.forEach((field) =>
      setFieldError(field as keyof ApplicationInput, {
        type: "server",
        message: fieldErrors[field],
      }),
    );
    const firstStep = Math.min(...fields.map((field) => fieldStep[field] || 4));
    setStep(firstStep);
    setError("Please correct the highlighted fields.");
  }
  function next() {
    if (step === 1) {
      const formatted = normalizeWhatsApp(
        getValues("whatsapp") || "",
        getValues("country_of_residence") || "",
      );
      setValue("whatsapp", formatted, { shouldValidate: true });
    }
    const parsed =
      applicationStepSchemas[step as 1 | 2 | 3].safeParse(getValues());
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = String(issue.path[0]);
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      showFieldErrors(fieldErrors);
      return;
    }
    setError("");
    setStep(step + 1);
  }
  function onInvalid(validationErrors: any) {
    const fieldErrors = Object.fromEntries(
      Object.entries(validationErrors).map(([field, value]: [string, any]) => [
        field,
        value?.message || "This field is required.",
      ]),
    );
    showFieldErrors(fieldErrors);
  }
  async function submit(data: ApplicationInput) {
    if (!file) return setError("Please attach your CV.");
    if (!turnstileSiteKey && process.env.NODE_ENV === "production")
      return setError("Applications are temporarily unavailable. Please try again later.");
    if (turnstileSiteKey && !turnstileToken)
      return setError("Please complete bot verification before submitting.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...data,
          turnstile_token: turnstileToken,
          cv: { filename: file.name, mime: file.type, size: file.size },
        }),
      });
      const out = await res.json();
      if (!res.ok) {
        if (turnstileSiteKey) {
          setTurnstileToken("");
          setTurnstileResetKey((value) => value + 1);
        }
        if (out.fieldErrors) showFieldErrors(out.fieldErrors);
        throw new Error(out.error);
      }
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
      sessionStorage.removeItem(draftKey);
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
      <form onSubmit={handleSubmit(submit, onInvalid)} className="space-y-4">
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
              l="WhatsApp number"
              type="tel"
              inputMode="tel"
              e={errors.whatsapp?.message}
            />
            {countryCallingCode(watch("country_of_residence") || "") && (
              <p className="text-sm">
                Country calling code: {countryCallingCode(watch("country_of_residence") || "")}. You can enter a local number or a full international number.
              </p>
            )}
            <CountryInput
              r={register("country_of_residence")}
              l="Country of residence"
              value={watch("country_of_residence")}
              id="country-of-residence"
              e={errors.country_of_residence?.message}
            />
            <CountryInput
              r={register("nationality")}
              l="Nationality"
              value={watch("nationality")}
              id="nationality"
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
                <span className="text-red-700">
                  {errors.motivation.message}
                </span>
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
            {turnstileSiteKey ? (
              <TurnstileWidget
                key={turnstileResetKey}
                siteKey={turnstileSiteKey}
                onToken={setTurnstileToken}
                onError={setTurnstileError}
              />
            ) : process.env.NODE_ENV === "production" ? (
              <p className="text-red-700" role="alert">
                Applications are temporarily unavailable. Please try again later.
              </p>
            ) : null}
            {turnstileError && (
              <p className="text-red-700" role="alert">{turnstileError}</p>
            )}
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
              onClick={next}
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
function CountryInput({ r, l, e, value, id }: any) {
  const code = resolveCountryCode(value || "");
  return (
    <label className="block">
      {l}
      <input className="field" list={`${id}-options`} autoComplete="off" {...r} />
      <datalist id={`${id}-options`}>
        {countries.map(({ code, name }) => (
          <option key={code} value={`${name} (${code})`} />
        ))}
      </datalist>
      {code && <span className="block text-sm">ISO code: {code}</span>}
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
