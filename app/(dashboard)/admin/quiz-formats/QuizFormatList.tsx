"use client";
import { DashboardSidebar } from "@/components";
import toast from "react-hot-toast";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { getQuizFormatExplainerUrl } from "@/utils/cdn";

interface QuizFormat {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  explainerImages?: string;
  displayOrder: number;
  _count?: {
    products: number;
  };
}

const QuizFormatList = () => {
  const [quizFormats, setQuizFormats] = useState<QuizFormat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchQuizFormats();
  }, []);

  const fetchQuizFormats = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/quiz-formats`);
      if (!response.ok) throw new Error("Failed to fetch quiz formats");
      const data = await response.json();
      setQuizFormats(data);
    } catch (error) {
      console.error("Error fetching quiz formats:", error);
      toast.error("Failed to load quiz formats");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteQuizFormat = async (id: string) => {
    const format = quizFormats.find(f => f.id === id);
    if (format?._count?.products && format._count.products > 0) {
      toast.error(`Cannot delete: ${format._count.products} product(s) are using this format`);
      return;
    }

    if (!confirm("Are you sure you want to delete this quiz format?")) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/quiz-formats/${id}`, {
        method: "DELETE",
      });

      if (response.status === 204) {
        toast.success("Quiz format deleted successfully");
        setQuizFormats(prev => prev.filter(f => f.id !== id));
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete quiz format");
      }
    } catch (error: any) {
      console.error("Error deleting quiz format:", error);
      toast.error(error.message || "Failed to delete quiz format");
    }
  };

  const getExplainerImageCount = (format: QuizFormat): number => {
    if (!format.explainerImages) return 0;
    try {
      const images = JSON.parse(format.explainerImages);
      return Array.isArray(images) ? images.length : 0;
    } catch {
      return 0;
    }
  };

  const getFirstExplainerImage = (format: QuizFormat): string | null => {
    if (!format.explainerImages) return null;
    try {
      const images = JSON.parse(format.explainerImages);
      if (Array.isArray(images) && images.length > 0) {
        return getQuizFormatExplainerUrl(images[0]);
      }
    } catch {
      return null;
    }
    return null;
  };

  const filteredFormats = quizFormats.filter(format =>
    format.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    format.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-gray-100 flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 p-6 overflow-auto">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-center mb-6 max-xl:flex-col max-xl:gap-y-4 max-xl:items-start">
            <h1 className="text-2xl font-semibold">Quiz Formats</h1>
            <div className="flex gap-4 max-xl:flex-col max-xl:w-full">
              <input
                type="text"
                placeholder="Search quiz formats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input input-bordered w-full max-w-xs"
              />
              <Link href="/admin/quiz-formats/new">
                <button className="btn btn-primary">Add New Quiz Format</button>
              </Link>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-md w-full">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Order</th>
                  <th>Explainer Images</th>
                  <th>Products</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFormats.map((format) => (
                  <tr key={format.id}>
                    <td className="w-20">
                      {getFirstExplainerImage(format) ? (
                        <img
                          src={getFirstExplainerImage(format)!}
                          alt={format.displayName}
                          className="h-12 w-12 object-cover rounded"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                          No img
                        </div>
                      )}
                    </td>
                    <td className="font-medium">{format.displayName}</td>
                    <td className="text-gray-500">{format.name}</td>
                    <td>{format.displayOrder}</td>
                    <td>{getExplainerImageCount(format)} images</td>
                    <td>{format._count?.products || 0}</td>
                    <td className="flex gap-2">
                      <Link href={`/admin/quiz-formats/${format.id}`}>
                        <button className="btn btn-sm btn-info">Edit</button>
                      </Link>
                      <button
                        className="btn btn-sm btn-error"
                        onClick={() => deleteQuizFormat(format.id)}
                        disabled={(format._count?.products || 0) > 0}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                  {filteredFormats.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-gray-500 py-8">
                        No quiz formats found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizFormatList;
