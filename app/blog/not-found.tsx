import Link from "next/link";

export default function BlogNotFound() {
  return (
    <>
      <main className="grid min-h-full place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8">
        <div className="text-center">
          <p className="text-lg font-semibold bg-blue-500 text-white py-2 rounded-full w-16 mx-auto">
            404
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-black sm:text-5xl">
            Blog post not found
          </h1>
          <p className="mt-6 text-base leading-7 text-black">
            Sorry, we couldn't find the article you're looking for.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6 max-[350px]:flex-col max-[350px]:gap-y-5">
            <Link
              href="/blog"
              className="rounded-md bg-blue-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:text-white hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Back to blog
            </Link>
            <Link
              href="/"
              className="rounded-md border border-blue-500 px-3.5 py-2.5 text-sm font-semibold text-blue-500 shadow-sm hover:bg-blue-50"
            >
              Go home
            </Link>
            <Link
              href="/contact"
              className="text-sm font-semibold text-black hover:underline hover:underline-offset-4"
            >
              Contact us {<span aria-hidden="true">&rarr;</span>}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}