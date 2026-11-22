import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge must know about the custom `text-2xs` size defined in globals.css; otherwise it treats
 * `text-2xs` as a color and drops it when merged with a text color such as `text-muted-foreground`.
 */
const twMerge = extendTailwindMerge({ extend: { theme: { text: ["2xs"] } } });

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
