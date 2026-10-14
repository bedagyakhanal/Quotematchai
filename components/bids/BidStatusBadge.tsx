import { BidStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

export function BidStatusBadge({
  status,
  className,
}: {
  status: BidStatus;
  className?: string;
}) {
  switch (status) {
    case "won":
      return (
        <Badge variant="won" className={className}>
          Won
        </Badge>
      );
    case "lost":
      return (
        <Badge variant="lost" className={className}>
          Not selected
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="pending" className={className}>
          Pending
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
