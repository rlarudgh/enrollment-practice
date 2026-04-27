import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

export default function EnrollmentLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 py-4">
        <Skeleton className="h-8 w-32" />
      </header>
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-6">
          <div>
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>

          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={`step-${i}`} className="h-10 flex-1 rounded-md" />
            ))}
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </main>
    </div>
  );
}
