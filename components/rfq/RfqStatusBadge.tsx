import { RFQStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

export function RfqStatusBadge({
  status,
  className,
}: {
  status: RFQStatus;
  className?: string;
}) {
  switch (status) {
    case "open":
      return (
        <Badge variant="open" className={className}>
          Open
        </Badge>
      );
    case "awarded":
      return (
        <Badge variant="awarded" className={className}>
          Awarded
        </Badge>
      );
    case "closed":
      return (
        <Badge variant="lost" className={className}>
          Closed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
