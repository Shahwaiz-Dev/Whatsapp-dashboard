import { Suspense } from "react";
import { ComposePageContent } from "@/components/compose/compose-page";
import { Skeleton } from "@/components/ui/skeleton";

export default function ComposePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <ComposePageContent />
    </Suspense>
  );
}
