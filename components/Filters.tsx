"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSortStore } from "@/app/store/sortStore";
import { usePaginationStore } from "@/app/store/paginationStore";

interface QuizFormat {
  id: string;
  name: string;
  displayName: string;
}

interface Category {
  id: string;
  name: string;
}

interface InputCategory {
  inStock: { text: string, isChecked: boolean },
  outOfStock: { text: string, isChecked: boolean },
  priceFilter: { text: string, value: number },
  ratingFilter: { text: string, value: number },
}

const Filters = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { page } = usePaginationStore();

  const [inputCategory, setInputCategory] = useState<InputCategory>({
    inStock: { text: "instock", isChecked: true },
    outOfStock: { text: "outofstock", isChecked: true },
    priceFilter: { text: "price", value: 100 },
    ratingFilter: { text: "rating", value: 0 },
  });

  const [quizFormats, setQuizFormats] = useState<QuizFormat[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedQuizFormat, setSelectedQuizFormat] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const { sortBy } = useSortStore();

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/quiz-formats`)
      .then((res) => res.json())
      .then((data) => setQuizFormats(data))
      .catch((err) => console.error("Error fetching quiz formats:", err));

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories?type=PRODUCT`)
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Error fetching categories:", err));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("outOfStock", inputCategory.outOfStock.isChecked.toString());
    params.set("inStock", inputCategory.inStock.isChecked.toString());
    params.set("rating", inputCategory.ratingFilter.value.toString());
    params.set("price", inputCategory.priceFilter.value.toString());
    params.set("sort", sortBy);
    params.set("page", page.toString());

    if (selectedQuizFormat) {
      params.set("quizFormat", selectedQuizFormat);
    }
    if (selectedCategory) {
      params.set("category", selectedCategory);
    }

    router.replace(`${pathname}?${params}`, { scroll: false });
  }, [inputCategory, sortBy, page, selectedQuizFormat, selectedCategory]);

  const formatCategoryName = (name: string) => {
    return name
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-900 border-b border-gray-900 pb-2">
        Filters
      </h3>

      {/* Quiz Format Filter */}
      <div>
        <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-2">
          Format
        </label>
        <select
          className="w-full border border-gray-300 py-2 px-3 text-xs bg-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
          value={selectedQuizFormat}
          onChange={(e) => setSelectedQuizFormat(e.target.value)}
        >
          <option value="">All</option>
          {quizFormats.map((format) => (
            <option key={format.id} value={format.name}>
              {format.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* Category Filter */}
      <div>
        <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-2">
          Category
        </label>
        <select
          className="w-full border border-gray-300 py-2 px-3 text-xs bg-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">All</option>
          {categories.map((category) => (
            <option key={category.id} value={category.name}>
              {formatCategoryName(category.name)}
            </option>
          ))}
        </select>
      </div>

      {/* Availability - Hidden for now since all products are digital and always in stock
      <div>
        <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-2">
          Availability
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={inputCategory.inStock.isChecked}
              onChange={() =>
                setInputCategory({
                  ...inputCategory,
                  inStock: {
                    text: "instock",
                    isChecked: !inputCategory.inStock.isChecked,
                  },
                })
              }
              className="w-3.5 h-3.5 border border-gray-400 accent-primary"
            />
            <span className="text-xs text-gray-700 group-hover:text-primary transition-colors">In stock</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={inputCategory.outOfStock.isChecked}
              onChange={() =>
                setInputCategory({
                  ...inputCategory,
                  outOfStock: {
                    text: "outofstock",
                    isChecked: !inputCategory.outOfStock.isChecked,
                  },
                })
              }
              className="w-3.5 h-3.5 border border-gray-400 accent-primary"
            />
            <span className="text-xs text-gray-700 group-hover:text-primary transition-colors">Out of stock</span>
          </label>
        </div>
      </div>
      */}

      {/* Price */}
      <div>
        <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-2">
          Max Price
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={inputCategory.priceFilter.value}
          className="w-full h-1 bg-gray-200 appearance-none cursor-pointer accent-primary"
          onChange={(e) =>
            setInputCategory({
              ...inputCategory,
              priceFilter: {
                text: "price",
                value: Number(e.target.value),
              },
            })
          }
        />
        <div className="text-xs text-gray-900 font-medium mt-1">
          £{inputCategory.priceFilter.value}
        </div>
      </div>

      {/* Rating - Hidden for now
      <div>
        <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-2">
          Min Rating
        </label>
        <input
          type="range"
          min={0}
          max={5}
          value={inputCategory.ratingFilter.value}
          onChange={(e) =>
            setInputCategory({
              ...inputCategory,
              ratingFilter: { text: "rating", value: Number(e.target.value) },
            })
          }
          className="w-full h-1 bg-gray-200 appearance-none cursor-pointer accent-primary"
          step="1"
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-0.5">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={inputCategory.ratingFilter.value === n ? "text-primary font-medium" : ""}
            >
              {n}
            </span>
          ))}
        </div>
      </div>
      */}
    </div>
  );
};

export default Filters;
