/**
 * Header Component
 *
 * Top navigation bar containing user information, menu toggle for mobile,
 * organization context, and user actions like logout.
 */

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { twMerge } from "tailwind-merge";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface HeaderProps {
  user: User;
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onMenuClick,
  sidebarOpen,
}) => {
  const { logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setUserMenuOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getUserDisplayName = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    return user.email;
  };

  const getUserInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.firstName) {
      return user.firstName[0].toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left section: Menu toggle and Logo */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className={twMerge(
              "p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100",
              "lg:hidden",
              "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            )}
            aria-label="Toggle sidebar"
          >
            <svg
              className={twMerge(
                "h-6 w-6 transition-transform duration-200",
                sidebarOpen ? "rotate-90" : "rotate-0"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Logo and app title */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">PM</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-gray-900">
                  Project Manager
                </h1>
                {user.organization && (
                  <p className="text-xs text-gray-500">
                    {user.organization.name}
                  </p>
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* Right section: User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            {/* User avatar */}
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {getUserInitials()}
              </span>
            </div>

            {/* User info - hidden on mobile */}
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-900">
                {getUserDisplayName()}
              </p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>

            {/* Dropdown arrow */}
            <svg
              className={twMerge(
                "h-4 w-4 text-gray-400 transition-transform duration-200",
                userMenuOpen ? "rotate-180" : "rotate-0"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* User dropdown menu */}
          {userMenuOpen && (
            <>
              {/* Overlay for mobile */}
              <div
                className="fixed inset-0 z-10 md:hidden"
                onClick={() => setUserMenuOpen(false)}
              />

              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
                {/* User info on mobile */}
                <div className="md:hidden px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">
                    {getUserDisplayName()}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  {user.organization && (
                    <p className="text-xs text-gray-500 mt-1">
                      Organization: {user.organization.name}
                    </p>
                  )}
                </div>

                {/* Menu items */}
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Profile Settings
                </Link>

                {user.organization && (
                  <Link
                    href="/organization"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Organization Settings
                  </Link>
                )}

                <div className="border-t border-gray-200"></div>

                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
