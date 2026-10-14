import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageShell({
  title,
  description,
  actions,
  children,
  className,
  ...props
}: PageShellProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 min-w-[320px]",
        className
      )}
      {...props}
    >
      {(title || actions) && (
        <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && (
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-1 text-sm text-slate-600 max-w-2xl">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
