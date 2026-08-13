import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Us | Fat Big Quiz",
  description:
    "Get in touch with the Fat Big Quiz team. Questions about events, quiz packs, subscriptions, or anything else - we are here to help.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Get in touch
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Whether you have a question about our events, quiz packs, or
            anything else, we would love to hear from you.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Email us</h2>
            <p className="mt-2 text-sm text-gray-600">
              For general enquiries, support, or feedback.
            </p>
            <a
              href="mailto:info@fatbigquiz.com"
              className="mt-4 inline-block text-primary font-medium hover:underline"
            >
              info@fatbigquiz.com
            </a>
          </div>

          <div className="rounded-xl border border-gray-200 p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Book an event
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Looking to book a quiz night, game show, or corporate event?
            </p>
            <Link
              href="/events"
              className="mt-4 inline-block text-primary font-medium hover:underline"
            >
              Browse events
            </Link>
          </div>
        </div>

        <div className="mt-12 rounded-xl border border-gray-200 p-6 text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Hire a quiz master
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Want a regular quiz night at your venue? We offer two tiers to suit
            any setting.
          </p>
          <Link
            href="/hire"
            className="mt-4 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition"
          >
            Find out more
          </Link>
        </div>
      </div>
    </main>
  );
}
