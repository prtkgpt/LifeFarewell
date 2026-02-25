"use client";

import { useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToShortlist } from "./actions";

export function VendorShortlistButton({
  caseId,
  vendorId,
}: {
  caseId: string;
  vendorId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await addToShortlist(caseId, vendorId);
        });
      }}
      className="w-full"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Plus className="h-3.5 w-3.5" />
      )}
      Add to Shortlist
    </Button>
  );
}
