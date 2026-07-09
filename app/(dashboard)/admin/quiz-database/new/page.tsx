"use client";

import React from "react";
import QuestionForm from "../QuestionForm";

export default function NewQuestionPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Add New Question</h1>
      <div className="bg-gray-800 rounded-lg p-6">
        <QuestionForm />
      </div>
    </div>
  );
}
