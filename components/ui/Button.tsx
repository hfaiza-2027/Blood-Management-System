import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "subtle";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-hemo-600 text-white hover:bg-hemo-700 active:bg-hemo-800 disabled:bg-hemo-300",
  secondary: "bg-ink-900 text-white hover:bg-ink-800 disabled:bg-ink-300",
  outline: "border border-line bg-white text-ink-800 hover:bg-ink-50 hover:border-ink-200 disabled:text-ink-300",
  ghost: "text-ink-700 hover:bg-ink-100 disabled:text-ink-300",
  danger: "border border-hemo-200 bg-white text-hemo-700 hover:bg-hemo-50 disabled:text-hemo-300",
  subtle: "bg-hemo-50 text-hemo-700 hover:bg-hemo-100",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2",
  icon: "h-9 w-9 justify-center",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded font-semibold transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500 focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
}

export function Button({ variant = "primary", size = "md", loading, loadingText, icon, className, children, disabled, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

export function ButtonLink({ variant = "primary", size = "md", icon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
