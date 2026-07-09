import QuizDatabaseClient from "./QuizDatabaseClient";

export const metadata = {
  title: "Quiz Questions Database | Fat Big Quiz",
  description:
    "Search thousands of quiz questions across hundreds of categories. Filter by topic, difficulty, country, theme, and more.",
};

export default function QuizDatabasePage() {
  return <QuizDatabaseClient />;
}
