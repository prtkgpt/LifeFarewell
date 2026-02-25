"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Toast as ToastType } from "./use-toast";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-lg border p-4 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full",
  {
    variants: {
      variant: {
        default: "border-stone-200 bg-white text-stone-900",
        destructive: "border-red-200 bg-red-50 text-red-900",
        success: "border-emerald-200 bg-emerald-50 text-emerald-900",
        warning: "border-amber-200 bg-amber-50 text-amber-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, toast: toastData, onDismiss, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant: toastData.variant ?? variant }), className)}
        data-state="open"
        {...props}
      >
        <div className="grid gap-1">
          {toastData.title && (
            <div className="text-sm font-semibold">{toastData.title}</div>
          )}
          {toastData.description && (
            <div className="text-sm opacity-90">{toastData.description}</div>
          )}
        </div>
        <button
          onClick={() => onDismiss(toastData.id)}
          className="rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/5 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }
);
Toast.displayName = "Toast";

export { Toast, toastVariants };
