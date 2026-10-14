import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { RfqCreator } from "@/components/rfq/RfqCreator";

export default function NewRfqPage() {
  return (
    <PageShell
      title="Create Request for Quote"
      description="Describe your required materials naturally with AI assistance, or fill in the structured fields manually."
      actions={
        <Link href="/buyer">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to My RFQs</span>
          </Button>
        </Link>
      }
    >
      <div className="py-2">
        <RfqCreator />
      </div>
    </PageShell>
  );
}
