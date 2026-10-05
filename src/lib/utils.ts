import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// WHY: shadcn components compose many conditional Tailwind classes.
// clsx handles conditions, twMerge resolves conflicts (e.g. px-2 vs px-4).
export function mergeClassNames(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
