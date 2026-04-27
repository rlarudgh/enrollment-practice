"use client";

import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import Link from "next/link";

export default function EnrollmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-10 pb-8 space-y-4">
          <h1 className="text-2xl font-bold">수강 신청 오류</h1>
          <p className="text-muted-foreground text-sm">
            {error.message || "수강 신청 처리 중 오류가 발생했습니다. 다시 시도해 주세요."}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button onClick={reset}>다시 시도</Button>
            <Link href="/enrollment">
              <Button variant="outline">처음부터 다시하기</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
