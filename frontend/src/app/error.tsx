"use client";

import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import Link from "next/link";

export default function Error({
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
          <h1 className="text-4xl font-bold text-destructive">오류 발생</h1>
          <p className="text-muted-foreground text-sm">
            {error.message || "예상치 못한 오류가 발생했습니다."}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button onClick={reset}>다시 시도</Button>
            <Link href="/">
              <Button variant="outline">홈으로 돌아가기</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
