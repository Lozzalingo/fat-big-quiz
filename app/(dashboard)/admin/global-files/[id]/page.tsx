import GlobalFileForm from "../GlobalFileForm";

interface EditGlobalFilePageProps {
  params: { id: string };
}

export default function EditGlobalFilePage({ params }: EditGlobalFilePageProps) {
  return <GlobalFileForm mode="edit" fileId={params.id} />;
}
