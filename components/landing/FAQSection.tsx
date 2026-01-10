"use client";

import React, { useState } from "react";
import { FaChevronDown } from "react-icons/fa";

interface FAQ {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  title?: string;
  subtitle?: string;
  faqs: FAQ[];
}

const FAQSection: React.FC<FAQSectionProps> = ({
  title = "Frequently Asked Questions",
  subtitle,
  faqs,
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="bg-white py-16 md:py-24">
      <div className="max-w-screen-lg mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-border rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                data-track-button="FAQ:Toggle Question"
                className="w-full flex items-center justify-between p-5 text-left bg-background hover:bg-background/80 transition"
              >
                <span className="font-semibold text-text-primary pr-4">
                  {faq.question}
                </span>
                <FaChevronDown
                  className={`text-primary flex-shrink-0 transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? "max-h-96" : "max-h-0"
                }`}
              >
                <div className="p-5 pt-2 text-text-secondary">{faq.answer}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FAQSection;
