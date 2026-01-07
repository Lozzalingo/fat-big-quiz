import QuizFormatForm from "../QuizFormatForm";

interface Props {
  params: { id: string };
}

export default function EditQuizFormatPage({ params }: Props) {
  return <QuizFormatForm id={params.id} />;
}
