
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SummaryStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-3/5" /> {/* Title skeleton */}
            <Skeleton className="h-5 w-5 rounded-sm" /> {/* Icon skeleton */}
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-2/5 mb-2" /> {/* Main stat value skeleton */}
            <Skeleton className="h-3 w-4/5" /> {/* Description skeleton */}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
