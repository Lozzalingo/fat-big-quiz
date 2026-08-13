// *********************
// Role of the component: Rating stars component that will display stars on the single product page 
// Name of the component: SingleProductRating.tsx
// Developer: Aleksandar Kuzmanovic
// Version: 1.0
// Component call: <SingleProductRating rating={rating} reviewCount={reviewCount} />
// Input parameters: { rating: number, reviewCount?: number }
// Output: full colored star icons and outlined star icons depending on the ratingArray element("empty star" or "full star")
// *********************

import React from "react";
import { AiFillStar, AiOutlineStar } from "react-icons/ai";

interface SingleProductRatingProps {
  rating: number;
  reviewCount?: number;
}

const SingleProductRating = ({ rating, reviewCount = 0 }: SingleProductRatingProps) => {
  const ratingArray: Array<string> = [
    "empty star",
    "empty star",
    "empty star",
    "empty star",
    "empty star",
  ];

  // going through product rating and modifying rating state
  for (let i = 0; i < rating; i++) {
    ratingArray[i] = "full star";
  }
  return (
    <div className="flex text-2xl items-center max-[500px]:justify-center">
      {ratingArray &&
        ratingArray.map((singleRating) => {
          return (
            <>
              {singleRating === "full star" ? (
                <AiFillStar className="text-custom-yellow" />
              ) : (
                <AiOutlineStar className="text-custom-yellow" />
              )}
            </>
          );
        })}
      <span className="text-xl ml-1">({reviewCount} {reviewCount === 1 ? "review" : "reviews"})</span>
    </div>
  );
};

export default SingleProductRating;
