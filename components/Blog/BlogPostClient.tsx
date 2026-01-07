'use client';

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import CommentsSection from "@/components/CommentsSection";

interface BlogPostClientProps {
  postId: string;
}

export default function BlogPostClient({ postId }: BlogPostClientProps) {
  const { data: session, status } = useSession();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/email/${session?.user?.email}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.id) {
            setUserId(data.id);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch user ID", err);
        });
    }
  }, [status, session?.user?.email]);

  if (status === "loading") {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="mt-2 text-gray-600">Loading comments section...</p>
      </div>
    );
  }

  return <CommentsSection postId={postId} userId={userId} />;
}
