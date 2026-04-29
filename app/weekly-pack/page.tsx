import { MainHeaderClient } from "@/components";
import ComingSoonSignup from "@/app/components/ComingSoonSignup";

export const metadata = {
  title: "Weekly Quiz Pack - Coming Soon | Fat Big Quiz",
  description: "Fresh quiz content delivered every week. Perfect for pubs and regular quiz nights.",
};

export default function WeeklyPackPage() {
  return (
    <>
      <MainHeaderClient />
      <ComingSoonSignup
        source="weekly-pack"
        title="Weekly Quiz Pack"
        emoji="📦"
        description="Fresh quiz content delivered every week. Perfect for pubs and regular quiz nights."
      />
    </>
  );
}
