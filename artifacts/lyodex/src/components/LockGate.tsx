import { type ReactNode } from "react";
import { Lock } from "lucide-react";

interface LockGateProps {
  locked: boolean;
  children: ReactNode;
}

export function LockGate({ locked, children }: LockGateProps) {
  if (!locked) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-5">
        <Lock className="w-6 h-6 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-bold mb-2">Temporarily unavailable</h2>
      <p className="text-muted-foreground max-w-sm leading-relaxed">
        This section is temporarily unavailable. Check back soon.
      </p>
    </div>
  );
}
