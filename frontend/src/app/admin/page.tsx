"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/model/auth-context";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { toast } from "sonner";

export default function AdminPage() {
  const { user, isLoading, isAuthenticated, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !hasRole("CREATOR")) {
      toast.error("관리자 권한이 필요합니다");
      router.push("/enrollment");
    }
  }, [isLoading, hasRole, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || !hasRole("CREATOR")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">관리자 페이지</h1>
          <p className="text-slate-600 mt-2">환영합니다, {user?.name}님</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">강의 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => toast.info("준비 중입니다")}>
                강의 목록 보기
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">수강 신청 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => toast.info("준비 중입니다")}>
                신청 현황 보기
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">통계</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => toast.info("준비 중입니다")}>
                통계 보기
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Button variant="outline" onClick={() => router.push("/enrollment")}>
            ← 수강 신청 페이지로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
}
