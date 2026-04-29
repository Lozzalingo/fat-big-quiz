import { MainHeaderClient } from "@/components";
import ComingSoonSignup from "@/app/components/ComingSoonSignup";

export const metadata = {
  title: "Questions Database - Coming Soon | Fat Big Quiz",
  description: "Access thousands of questions across hundreds of categories. Build your own quizzes.",
};

export default function QuizDatabasePage() {
  return (
    <>
      <MainHeaderClient />
      <ComingSoonSignup
        source="quiz-database"
        title="Questions Database"
        emoji="🗃️"
        description="Access thousands of questions across hundreds of categories. Build your own quizzes."
      />
    </>
  );
}
