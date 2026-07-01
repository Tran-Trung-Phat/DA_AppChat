import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function resolveImageUrl(url?: string) {
  if (!url) return "";
  if (url.startsWith("http://localhost:5001")) {
    const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
    return url.replace("http://localhost:5001", backendUrl);
  }
  return url;
}
