/**
 * Apollo Provider Wrapper for Next.js
 *
 * Client-side wrapper that provides Apollo Client context to the entire app.
 * This is necessary for Next.js Server-Side Rendering compatibility.
 */

"use client";

import React from "react";
import { ApolloProvider } from "@apollo/client/react";
import { apolloClient } from "./apollo";

interface ApolloWrapperProps {
  children: React.ReactNode;
}

export function ApolloWrapper({ children }: ApolloWrapperProps) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}
