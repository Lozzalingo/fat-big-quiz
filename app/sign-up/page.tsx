"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { FaSpinner, FaUserPlus } from "react-icons/fa";
import { z } from "zod";

const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  marketingOptIn: z.boolean(),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms and conditions",
  }),
  privacyAccepted: z.boolean().refine((val) => val === true, {
    message: "You must agree to the privacy policy",
  }),
});

type SignUpForm = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const [form, setForm] = useState<SignUpForm>({
    email: "",
    firstName: "",
    lastName: "",
    marketingOptIn: false,
    termsAccepted: false,
    privacyAccepted: false,
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof SignUpForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrors({});

    console.log("[SignUp] Form submitted for:", form.email);

    // Validate with Zod
    const result = signUpSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      console.error("[SignUp] Validation failed:", fieldErrors);
      setErrors(fieldErrors);
      setStatus("error");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/subscribers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          marketingOptIn: form.marketingOptIn,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        console.log("[SignUp] Success for:", form.email);
        toast.success("You have been signed up successfully!");
        setStatus("success");
      } else {
        console.error("[SignUp] Failed:", data.error);
        setErrors({ form: data.error || "Something went wrong. Please try again." });
        setStatus("error");
      }
    } catch (error) {
      console.error("[SignUp] Request failed:", error);
      setErrors({ form: "Could not connect to the server. Please try again later." });
      setStatus("error");
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary-dark to-primary-light text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="relative max-w-screen-xl mx-auto px-4 py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight font-poppins">
            Join the{" "}
            <span className="text-gold">Fat Big Quiz</span>{" "}
            Community
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
            Get the latest quiz packs, game show updates, and exclusive content delivered straight to your inbox.
          </p>
        </div>
      </section>

      {/* Sign Up Form */}
      <section className="bg-background py-16 md:py-20">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-white rounded-xl shadow-xl p-8 border border-border -mt-12 relative z-10">
            {status === "success" ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-text-primary mb-4 font-poppins">
                  You are in!
                </h2>
                <p className="text-text-secondary">
                  Thanks for signing up. We will be in touch with the latest quizzes, game shows, and exclusive content.
                </p>
                <Link
                  href="/"
                  className="inline-block mt-6 bg-primary text-white font-bold px-6 py-3 rounded-xl hover:bg-primary-dark transition"
                  data-action="signup_success_home"
                >
                  Back to Home
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-text-primary mb-6 text-center font-poppins">
                  Sign Up
                </h2>

                {errors.form && (
                  <div className="bg-error/10 border border-error/30 text-error rounded-lg px-4 py-3 text-sm mb-6">
                    {errors.form}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition text-text-primary"
                      placeholder="you@example.com"
                    />
                    {errors.email && (
                      <p className="text-error text-sm mt-1">{errors.email}</p>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-text-primary mb-1">
                        First Name
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        required
                        value={form.firstName}
                        onChange={(e) => handleChange("firstName", e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition text-text-primary"
                        placeholder="Jane"
                      />
                      {errors.firstName && (
                        <p className="text-error text-sm mt-1">{errors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-text-primary mb-1">
                        Last Name
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        required
                        value={form.lastName}
                        onChange={(e) => handleChange("lastName", e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition text-text-primary"
                        placeholder="Smith"
                      />
                      {errors.lastName && (
                        <p className="text-error text-sm mt-1">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-3 pt-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.marketingOptIn}
                        onChange={(e) => handleChange("marketingOptIn", e.target.checked)}
                        className="checkbox checkbox-sm checkbox-primary mt-0.5"
                      />
                      <span className="text-sm text-text-secondary">
                        I want to hear about new quiz packs, quiz questions, and quiz events
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.termsAccepted}
                        onChange={(e) => handleChange("termsAccepted", e.target.checked)}
                        className="checkbox checkbox-sm checkbox-primary mt-0.5"
                      />
                      <span className="text-sm text-text-secondary">
                        I agree to the{" "}
                        <Link href="/terms" className="text-primary hover:underline" data-action="signup_terms_link">
                          terms and conditions
                        </Link>
                      </span>
                    </label>
                    {errors.termsAccepted && (
                      <p className="text-error text-sm ml-8">{errors.termsAccepted}</p>
                    )}

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.privacyAccepted}
                        onChange={(e) => handleChange("privacyAccepted", e.target.checked)}
                        className="checkbox checkbox-sm checkbox-primary mt-0.5"
                      />
                      <span className="text-sm text-text-secondary">
                        I agree to the{" "}
                        <Link href="/privacy" className="text-primary hover:underline" data-action="signup_privacy_link">
                          privacy policy
                        </Link>
                      </span>
                    </label>
                    {errors.privacyAccepted && (
                      <p className="text-error text-sm ml-8">{errors.privacyAccepted}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:bg-primary-dark hover:scale-105 transition text-lg disabled:opacity-60 disabled:hover:scale-100"
                    data-action="signup_submit"
                    name="signup_submit"
                  >
                    {status === "loading" ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Signing up...
                      </>
                    ) : (
                      <>
                        Sign Up
                        <FaUserPlus />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
