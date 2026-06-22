"use client";
import {
  CustomButton,
  DashboardProductTable,
} from "@/components";
import React from "react";

const DashboardProducts = () => {
  return (
    <div className="p-6 min-h-screen">
      <DashboardProductTable />
    </div>
  );
};

export default DashboardProducts;
