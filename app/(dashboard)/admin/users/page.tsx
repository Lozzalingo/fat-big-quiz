"use client";
import { CustomButton, DashboardSidebar } from "@/components";
import { getUserAvatarUrl } from "@/utils/cdn";
import { nanoid } from "nanoid";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const DashboardUsers = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // sending API request for all users
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users`)
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        setUsers(data);
      });
  }, []);

  return (
    <div className="bg-gray-100 flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 p-6 overflow-auto">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold">All Users</h1>
            <Link href="/admin/users/new">
              <CustomButton
                buttonType="button"
                customWidth="110px"
                paddingX={10}
                paddingY={5}
                textSize="base"
                text="Add new user"
              />
            </Link>
          </div>
          <div className="overflow-auto">
            <table className="table table-md table-pin-cols w-full">
            {/* head */}
            <thead>
              <tr>
                <th>
                  <label>
                    <input type="checkbox" className="checkbox" />
                  </label>
                </th>
                <th>Avatar</th>
                <th>Email</th>
                <th>Role</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {/* row 1 */}
              {users &&
                users.map((user) => (
                  <tr key={nanoid()}>
                    <th>
                      <label>
                        <input type="checkbox" className="checkbox" />
                      </label>
                    </th>
                    <td>
                      <div className="avatar">
                        <div className="w-10 h-10 rounded-full">
                          <img
                            src={getUserAvatarUrl(user?.avatar)}
                            alt={user?.email || "User"}
                            className="object-cover"
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <p>{user?.email}</p>
                    </td>
                    <td>
                      <p>{user?.role}</p>
                    </td>
                    <th>
                      <Link
                        href={`/admin/users/${user?.id}`}
                        className="btn btn-ghost btn-xs"
                      >
                        details
                      </Link>
                    </th>
                  </tr>
                ))}
            </tbody>
            {/* foot */}
            <tfoot>
              <tr>
                <th></th>
                <th>Avatar</th>
                <th>Email</th>
                <th>Role</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardUsers;
