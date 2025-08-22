/**
 * Utility for merging Tailwind CSS classes with proper conflict resolution
 * Uses clsx for conditional classes and tailwind-merge for deduplication
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines and deduplicates Tailwind CSS classes
 * @param inputs - Class values to combine
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Creates variant-based class combinations
 * @param base - Base classes always applied
 * @param variants - Object mapping variant keys to classes
 * @param defaultVariants - Default variant values
 */
export function createVariants<
  T extends Record<string, Record<string, string>>
>(
  base: string,
  variants: T,
  defaultVariants?: Partial<{ [K in keyof T]: keyof T[K] }>
) {
  return (
    props: Partial<{ [K in keyof T]: keyof T[K] }> & { className?: string }
  ) => {
    const variantClasses = Object.entries(variants).map(
      ([variantKey, variantValues]) => {
        const selectedVariant =
          props[variantKey as keyof typeof props] ||
          defaultVariants?.[variantKey as keyof typeof defaultVariants];

        if (selectedVariant && typeof selectedVariant === "string") {
          return variantValues[selectedVariant as string];
        }

        return "";
      }
    );

    return cn(base, ...variantClasses, props.className);
  };
}

/**
 * Utility for conditional class application
 * @param condition - Whether to apply the class
 * @param trueClass - Class to apply when true
 * @param falseClass - Class to apply when false
 */
export function conditionalClass(
  condition: boolean,
  trueClass: string,
  falseClass?: string
): string {
  return condition ? trueClass : falseClass || "";
}

/**
 * Creates focus ring classes consistent with the design system
 * @param color - Optional color override
 */
export function focusRing(color?: string): string {
  return cn(
    "focus:outline-none focus:ring-2 focus:ring-offset-2",
    color ? `focus:ring-${color}` : "focus:ring-primary"
  );
}

/**
 * Creates transition classes for common UI elements
 * @param type - Type of transition
 */
export function transition(
  type: "colors" | "transform" | "opacity" | "all" = "colors"
): string {
  const transitions = {
    colors: "transition-colors duration-200 ease-in-out",
    transform: "transition-transform duration-200 ease-in-out",
    opacity: "transition-opacity duration-200 ease-in-out",
    all: "transition-all duration-200 ease-in-out",
  };

  return transitions[type];
}
