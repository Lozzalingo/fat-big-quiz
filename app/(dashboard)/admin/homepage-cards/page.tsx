"use client";
import { DashboardSidebar } from "@/components";
import toast from "react-hot-toast";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { getHomepageCardImageUrl } from "@/utils/cdn";
import { FaGripVertical, FaEdit, FaTrash, FaPlus, FaEye, FaEyeSlash } from "react-icons/fa";

interface HomepageCard {
  id: string;
  title: string;
  description: string;
  price: string;
  href: string;
  image: string | null;
  badge: string | null;
  cardType: string;
  displayOrder: number;
  isActive: boolean;
}

const cardTypeLabels: Record<string, string> = {
  DOWNLOAD: "Download",
  SUBSCRIPTION: "Subscription",
  EVENT: "Event",
  APP: "App",
  FREE: "Free",
};

const cardTypeColors: Record<string, string> = {
  DOWNLOAD: "bg-primary",
  SUBSCRIPTION: "bg-success",
  EVENT: "bg-warning",
  APP: "bg-info",
  FREE: "bg-yellow-500",
};

export default function HomepageCardsPage() {
  const [cards, setCards] = useState<HomepageCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/homepage-cards`);
      if (!response.ok) throw new Error("Failed to fetch homepage cards");
      const data = await response.json();
      setCards(data);
    } catch (error) {
      console.error("Error fetching homepage cards:", error);
      toast.error("Failed to load homepage cards");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCard = async (id: string) => {
    if (!confirm("Are you sure you want to delete this card?")) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/homepage-cards/${id}`, {
        method: "DELETE",
      });

      if (response.status === 204) {
        toast.success("Card deleted successfully");
        setCards(prev => prev.filter(c => c.id !== id));
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete card");
      }
    } catch (error: any) {
      console.error("Error deleting card:", error);
      toast.error(error.message || "Failed to delete card");
    }
  };

  const toggleActive = async (card: HomepageCard) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/homepage-cards/${card.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !card.isActive }),
      });

      if (response.ok) {
        const updated = await response.json();
        setCards(prev => prev.map(c => c.id === card.id ? updated : c));
        toast.success(updated.isActive ? "Card activated" : "Card hidden");
      }
    } catch (error) {
      toast.error("Failed to update card");
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = cards.findIndex(c => c.id === draggedId);
    const targetIndex = cards.findIndex(c => c.id === targetId);

    const newCards = [...cards];
    const [removed] = newCards.splice(draggedIndex, 1);
    newCards.splice(targetIndex, 0, removed);

    setCards(newCards);
    setDraggedId(null);

    // Save new order
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/homepage-cards/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: newCards.map(c => c.id) }),
      });
      toast.success("Order updated");
    } catch (error) {
      toast.error("Failed to save order");
      fetchCards();
    }
  };

  return (
    <div className="bg-gray-100 flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 p-6 overflow-auto">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Homepage Cards</h1>
              <p className="text-gray-500 text-sm mt-1">Manage the cards shown on the homepage. Drag to reorder.</p>
            </div>
            <Link href="/admin/homepage-cards/new">
              <button className="btn btn-primary gap-2">
                <FaPlus /> Add Card
              </button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="mb-4">No homepage cards yet</p>
              <Link href="/admin/homepage-cards/new">
                <button className="btn btn-primary">Create your first card</button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, card.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, card.id)}
                  className={`flex items-center gap-4 p-4 bg-gray-50 rounded-lg border ${
                    draggedId === card.id ? "opacity-50" : ""
                  } ${!card.isActive ? "opacity-60" : ""} hover:bg-gray-100 transition cursor-move`}
                >
                  <FaGripVertical className="text-gray-400 flex-shrink-0" />

                  <div className="w-20 h-14 flex-shrink-0">
                    {card.image ? (
                      <img
                        src={card.image.startsWith("/") ? card.image : getHomepageCardImageUrl(card.image)}
                        alt={card.title}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                        <span className={`${cardTypeColors[card.cardType]} text-white text-xs px-2 py-0.5 rounded`}>
                          {cardTypeLabels[card.cardType]}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{card.title}</h3>
                      {card.badge && (
                        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">{card.badge}</span>
                      )}
                      {!card.isActive && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Hidden</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{card.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{card.price}</span>
                      <span>{card.href}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleActive(card)}
                      className={`btn btn-sm btn-ghost ${card.isActive ? "text-green-600" : "text-gray-400"}`}
                      title={card.isActive ? "Hide card" : "Show card"}
                    >
                      {card.isActive ? <FaEye /> : <FaEyeSlash />}
                    </button>
                    <Link href={`/admin/homepage-cards/${card.id}`}>
                      <button className="btn btn-sm btn-ghost text-blue-600">
                        <FaEdit />
                      </button>
                    </Link>
                    <button
                      onClick={() => deleteCard(card.id)}
                      className="btn btn-sm btn-ghost text-red-600"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
