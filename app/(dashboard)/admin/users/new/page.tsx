"use client";
import { DashboardSidebar } from "@/components";
import { UserProfileForm } from "@/app/(dashboard)/admin/users/UserComponents";
import { isValidEmailAddressFormat } from "@/lib/utils";
import React, { useState } from "react";
import toast from "react-hot-toast";

const DashboardCreateNewUser = () => {
  const [userInput, setUserInput] = useState({
    email: "",
    password: "",
    role: "user",
    firstName: "",
    lastName: "",
    bio: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const addNewUser = async () => {
    if (
      userInput.email.length > 3 &&
      userInput.role.length > 0 &&
      userInput.password.length > 0
    ) {
      if (!isValidEmailAddressFormat(userInput.email)) {
        toast.error("You entered invalid email address format");
        return;
      }

      if (userInput.password.length > 7) {
        setIsLoading(true);
        try {
          const requestOptions = {
            method: "post",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userInput),
          };
          
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users`, 
            requestOptions
          );
            
          if (response.status === 201) {
            await response.json();
            toast.success("User added successfully");
            setUserInput({
              email: "",
              password: "",
              role: "user",
              firstName: "",
              lastName: "",
              bio: ""
            });
          } else {
            throw Error("Error while creating user");
          }
        } catch (error) {
          console.error("Error creating user:", error);
          toast.error("Error while creating user");
        } finally {
          setIsLoading(false);
        }
      } else {
        toast.error("Password must be longer than 7 characters");
      }
    } else {
      toast.error("You must enter all required values to add a user");
    }
  };

  return (
    <div className="bg-white flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 p-4 overflow-auto flex flex-col gap-y-7">
        <h1 className="text-3xl font-semibold">Add New User</h1>
        
        <div className="max-w-md">
          <UserProfileForm 
            userInput={userInput} 
            setUserInput={(input) => setUserInput((prev) => ({ ...prev, ...input }))} 
            isAdmin={true} 
            isNewUser={true}
          />
          
          <div className="flex gap-x-2 mt-6">
            <button
              type="button"
              className="uppercase bg-blue-500 px-10 py-3 text-lg border-gray-300 font-bold text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 rounded-lg disabled:opacity-70 disabled:cursor-not-allowed"
              onClick={addNewUser}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Creating...
                </span>
              ) : (
                "Create User"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCreateNewUser;