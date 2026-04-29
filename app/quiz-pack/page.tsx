import { MainHeaderClient } from "@/components";
import ComingSoonSignup from "@/app/components/ComingSoonSignup";

export const metadata = {
  title: "Quiz Pack - Coming Soon | Fat Big Quiz",
  description: "Curated quiz packs for every occasion. Ready-made rounds, printable question sheets, and more.",
};

export default function QuizPackPage() {
  return (
    <>
      <MainHeaderClient />
      <ComingSoonSignup
        source="quiz-pack"
        title="Quiz Pack"
        emoji="📦"
        description="Curated quiz packs for every occasion. Ready-made rounds, printable question sheets, and more."
      />
    </>
  );
}
