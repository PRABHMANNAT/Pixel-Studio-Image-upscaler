import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ComponentProps } from "react";

const variants = cva("button inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold", {
  variants: {
    variant: { primary: "button-primary", outline: "button-outline", ghost: "button-ghost" },
    size: { default: "button-default", small: "button-small", icon: "button-icon" },
  },
  defaultVariants: { variant: "outline", size: "default" },
});

export function Button({ variant, size, className, type = "button", ...props }: ComponentProps<"button"> & VariantProps<typeof variants>) {
  return <button type={type} className={twMerge(clsx(variants({ variant, size }), className))} {...props} />;
}
