/**
 * Home Page
 *
 * Root page that redirects users to appropriate destinations based on authentication status.
 * Authenticated users go to dashboard, unauthenticated users go to login.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        router.push("/dashboard");
      } else {
        router.push("/auth/login");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading state while determining redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading Project Management System...</p>
      </div>
    </div>
  );
}
