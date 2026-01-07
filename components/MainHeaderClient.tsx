"use client";
import { useScroll } from "@/utils/ScrollContext";
import MainHeader from "./MainHeader";

export default function MainHeaderClient() {
  const { productsSectionRef } = useScroll();
  
  const handleShopClick = () => {
    if (productsSectionRef.current) {
      productsSectionRef.current.scrollIntoView({ behavior: "smooth" });
    } else {
      console.error("Products section ref is not available");
    }
  };
  
  return (
    <MainHeader onShopClick={handleShopClick} />
  );
}