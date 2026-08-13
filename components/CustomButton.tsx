import React from "react";

// Map Tailwind text-size tokens to CSS font-size values so callers can pass
// either a Tailwind token (e.g. "base") or a raw CSS value (e.g. "1rem").
const TAILWIND_TEXT_SIZE_MAP: Record<string, string> = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
  "4xl": "2.25rem",
  "5xl": "3rem",
  "6xl": "3.75rem",
};

interface CustomButtonProps {
  paddingX?: number | string;
  paddingY?: number | string;
  text: string;
  buttonType: "submit" | "reset" | "button";
  customWidth?: string;
  textSize?: string;
  trackButton?: string;
  onClick?: () => void;
}

const CustomButton = ({
  paddingX,
  paddingY,
  text,
  buttonType,
  customWidth,
  textSize,
  trackButton,
  onClick,
}: CustomButtonProps) => {
  const resolvedFontSize = textSize
    ? (TAILWIND_TEXT_SIZE_MAP[textSize] ?? textSize)
    : undefined;

  const inlineStyle: React.CSSProperties = {
    ...(customWidth && customWidth !== "no" ? { width: customWidth } : {}),
    ...(paddingX !== undefined ? { paddingLeft: paddingX, paddingRight: paddingX } : {}),
    ...(paddingY !== undefined ? { paddingTop: paddingY, paddingBottom: paddingY } : {}),
    ...(resolvedFontSize ? { fontSize: resolvedFontSize } : {}),
  };

  return (
    <button
      type={buttonType}
      onClick={onClick}
      data-track-button={trackButton || `Admin:${text}`}
      style={inlineStyle}
      className="uppercase bg-white border border-gray-300 font-bold text-blue-600 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2"
    >
      {text}
    </button>
  );
};

export default CustomButton;
