"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const PasswordInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function PasswordInput(
  { className, ...props },
  ref,
) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={show ? "text" : "password"} className={cn("h-10 pr-10", className)} {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={show ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});

export const MIN_PASSWORD = 10;

export function passwordScore(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= MIN_PASSWORD) s++;
  if (pw.length >= 14) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return pw.length < MIN_PASSWORD ? 0 : Math.max(1, Math.min(4, s));
}

export function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password);
  const labels = ["Too short", "Weak", "Okay", "Strong", "Very strong"];
  const colors = ["bg-red-500", "bg-orange-500", "bg-amber-400", "bg-emerald-500", "bg-emerald-600"];
  if (!password) return <p className="mt-1.5 text-xs text-muted-foreground">At least {MIN_PASSWORD} characters. A short sentence works well.</p>;
  const left = MIN_PASSWORD - password.length;
  const label = left > 0 ? `${left} more character${left === 1 ? "" : "s"}` : labels[score];
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i < Math.max(score, 1) ? colors[score] : "bg-secondary")} />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
