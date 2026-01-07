import Link from "next/link";
import { MainHeaderClient } from "@/components";

export const metadata = {
  title: "Questions Database - Coming Soon | Fat Big Quiz",
  description: "Access thousands of questions across hundreds of categories. Build your own quizzes.",
};

export default function QuizDatabasePage() {
  return (
    <>
      <MainHeaderClient />
      <div className="min-h-[60vh] flex items-center justify-center bg-background">
        <div className="text-center px-4">
          <div className="text-6xl mb-6">🗃️</div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            Questions Database
          </h1>
          <p className="text-lg text-text-secondary mb-8 max-w-md mx-auto">
            Access thousands of questions across hundreds of categories. Build your own quizzes.
          </p>
          <p className="text-primary font-semibold mb-8">Coming Soon!</p>
          <Link
            href="/shop"
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition"
          >
            Browse Quiz Downloads
          </Link>
        </div>
      </div>
    </>
  );
}
