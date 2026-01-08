import HomepageCardForm from "../HomepageCardForm";

interface EditHomepageCardPageProps {
  params: { id: string };
}

export default function EditHomepageCardPage({ params }: EditHomepageCardPageProps) {
  return <HomepageCardForm mode="edit" cardId={params.id} />;
}
