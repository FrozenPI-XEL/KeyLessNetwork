import { twMerge } from "tailwind-merge";
import clsx, { type ClassValue } from "clsx";

export const cn = (...TextInputs: ClassValue[]): string => {
  return twMerge(clsx(TextInputs));
};
