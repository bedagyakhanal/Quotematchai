import { Role } from "@/types";
import { Badge } from "@/components/ui/badge";

export function RoleBadge({
  role,
  className,
}: {
  role: Role | null | undefined;
  className?: string;
}) {
  if (!role) return null;

  if (role === "buyer") {
    return (
      <Badge
        variant="outline"
        className={`bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold px-2.5 py-0.5 text-xs ${className || ""}`}
      >
        Buyer
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold px-2.5 py-0.5 text-xs ${className || ""}`}
    >
      Seller
    </Badge>
  );
}
