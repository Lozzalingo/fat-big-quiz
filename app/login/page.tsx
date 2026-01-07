"use client";
import { isValidEmailAddressFormat } from "@/lib/utils";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

const LoginPage = () => {
  const router = useRouter();
  const [error, setError] = useState("");
  const { status: sessionStatus } = useSession();

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      router.replace("/");
    }
  }, [sessionStatus, router]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;

    if (!isValidEmailAddressFormat(email)) {
      setError("Email is invalid");
      toast.error("Email is invalid");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password is invalid");
      toast.error("Password is invalid");
      return;
    }

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError("Invalid email or password");
      toast.error("Invalid email or password");
      if (res?.url) router.replace("/");
    } else {
      setError("");
      toast.success("Successful login");
    }
  };

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-900 text-center mb-6">
          Sign in
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Email"
              required
              className="block w-full px-3 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none transition"
            />
          </div>

          <div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              required
              className="block w-full px-3 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none transition"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                name="remember-me"
                className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              Remember me
            </label>
            <a href="#" className="text-gray-500 hover:text-gray-700">
              Forgot password?
            </a>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-primary text-white text-sm font-medium py-2.5 rounded-lg hover:bg-primary/90 transition"
          >
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
