import React from "react";

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
  const inlineStyle: React.CSSProperties = {
    ...(customWidth && customWidth !== "no" ? { width: customWidth } : {}),
    ...(paddingX !== undefined ? { paddingLeft: paddingX, paddingRight: paddingX } : {}),
    ...(paddingY !== undefined ? { paddingTop: paddingY, paddingBottom: paddingY } : {}),
    ...(textSize ? { fontSize: textSize } : {}),
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
