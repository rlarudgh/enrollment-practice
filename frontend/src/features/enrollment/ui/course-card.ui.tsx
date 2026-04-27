import type { Course } from "@/entities/enrollment";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Calendar, Check, CreditCard, Users } from "lucide-react";
import { memo, useMemo } from "react";

interface CourseCardProps {
  course: Course;
  isSelected: boolean;
  onSelect: () => void;
}

const categoryLabels: Record<string, string> = {
  development: "개발",
  design: "디자인",
  marketing: "마케팅",
  business: "비즈니스",
};

export const CourseCard = memo(function CourseCard({ course, isSelected, onSelect }: CourseCardProps) {
  const isFull = course.currentEnrollment >= course.maxCapacity;
  const capacityPercentage = (course.currentEnrollment / course.maxCapacity) * 100;
  const isAlmostFull = capacityPercentage >= 80 && !isFull;

  const formattedDates = useMemo(
    () => ({
      start: new Date(course.startDate).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      end: new Date(course.endDate).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    }),
    [course.startDate, course.endDate],
  );

  const formatPrice = (price: number) => `${price.toLocaleString("ko-KR")}원`;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md overflow-hidden",
        isSelected && "ring-2 ring-primary",
        isFull && "opacity-60"
      )}
      onClick={() => !isFull && onSelect()}
    >
      {course.thumbnail ? (
        <div className="relative h-40 overflow-hidden">
          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
          {isFull ? (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Badge variant="destructive" className="text-lg px-3 py-1">
                정원 마감
              </Badge>
            </div>
          ) : isAlmostFull ? (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="bg-amber-500 text-white">
                마감 임박
              </Badge>
            </div>
          ) : null}
        </div>
      ) : null}
      <CardHeader className="pb-2">
        <Badge variant="secondary" className="w-fit mb-2">
          {categoryLabels[course.category] || course.category}
        </Badge>
        <CardTitle className="text-lg">{course.title}</CardTitle>
        <CardDescription className="line-clamp-2">{course.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 mr-2" />
          {formattedDates.start} ~ {formattedDates.end}
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Users className="w-4 h-4 mr-2" />
          {course.currentEnrollment}/{course.maxCapacity}명
          <span className="ml-2 text-xs">({Math.round(capacityPercentage)}%)</span>
        </div>
        <div className="flex items-center text-sm font-medium">
          <CreditCard className="w-4 h-4 mr-2" />
          {formatPrice(course.price)}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button
          variant={isSelected ? "default" : "outline"}
          className="w-full"
          disabled={isFull}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {isSelected ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              선택됨
            </>
          ) : isFull ? (
            "정원 마감"
          ) : (
            "선택하기"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
});
