"use client";

import React from "react";
import { useParams } from "next/navigation";
import QuestionForm from "../QuestionForm";

export default function EditQuestionPage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Edit Question</h1>
      <div className="bg-gray-800 rounded-lg p-6">
        <QuestionForm questionId={id} />
      </div>
    </div>
  );
}
