"use client";

import { useState, useEffect } from "react";
import type { EnrollmentFormData, EnrollmentType, EnrollmentResponse } from "@/entities/enrollment";
import { EnrollmentError, errorCodeMessages, useCourse, useSubmitEnrollment } from "@/entities/enrollment";
import { StepIndicator } from "@/features/enrollment/ui/step-indicator.ui";
import { Step1CourseSelection } from "@/features/enrollment/ui/step1-course-selection.ui";
import { Step2ApplicantInfo } from "@/features/enrollment/ui/step2-applicant-info.ui";
import { Step3ReviewSubmit } from "@/features/enrollment/ui/step3-review-submit.ui";
import { SuccessScreen } from "@/features/enrollment/ui/success-screen.ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { AlertCircle } from "lucide-react";

const STEPS = ["강의 선택", "정보 입력", "확인 및 제출"];

const defaultFormData: EnrollmentFormData = {
  courseId: "",
  type: "personal",
  applicant: {
    name: "",
    email: "",
    phone: "",
    motivation: "",
  },
  agreedToTerms: false,
};

export default function EnrollmentPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<EnrollmentFormData>(defaultFormData);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | undefined>(undefined);
  const [submitSuccess, setSubmitSuccess] = useState<EnrollmentResponse | null>(null);

  const { data: course } = useCourse(formData.courseId);
  const submitEnrollment = useSubmitEnrollment();

  const handleStep1Next = (data: { courseId: string; type: EnrollmentType }) => {
    setFormData((prev) => ({
      ...prev,
      courseId: data.courseId,
      type: data.type,
      group: data.type === "personal" ? undefined : prev.group,
    }));
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStep2Next = (data: { applicant: typeof formData.applicant; group?: typeof formData.group }) => {
    setFormData((prev) => ({
      ...prev,
      applicant: data.applicant,
      group: data.group,
    }));
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStep2Prev = () => {
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStep3Prev = () => {
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditStep = (step: number) => {
    setSubmitError(null);
    setFieldErrors(undefined);
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    try {
      setSubmitError(null);
      setFieldErrors(undefined);
      
      const response = await submitEnrollment.mutateAsync(formData);
      setSubmitSuccess(response);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err instanceof EnrollmentError) {
        setSubmitError(errorCodeMessages[err.code] || err.message);
        setFieldErrors(err.details);
      } else {
        setSubmitError("신청 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
      }
    }
  };

  const handleReset = () => {
    setFormData(defaultFormData);
    setCurrentStep(1);
    setSubmitSuccess(null);
    setSubmitError(null);
    setFieldErrors(undefined);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Prevent leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentStep > 1 && !submitSuccess) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentStep, submitSuccess]);

  if (submitSuccess) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <SuccessScreen
          response={submitSuccess}
          formData={formData}
          course={course || null}
          onReset={handleReset}
        />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">수강 신청</h1>
        <p className="text-muted-foreground">원하는 강의를 선택하고 신청해 주세요</p>
      </div>

      <StepIndicator currentStep={currentStep} totalSteps={3} stepLabels={STEPS} />

      {submitError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Field-level errors for step 3 */}
      {fieldErrors && currentStep === 3 && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-1">
            {Object.entries(fieldErrors).map(([field, message]) => (
              <div key={field}>{message}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1]}</CardTitle>
          <CardDescription>
            {currentStep === 1 && "수강할 강의와 신청 유형을 선택해 주세요."}
            {currentStep === 2 && "신청자 정보를 입력해 주세요."}
            {currentStep === 3 && "입력하신 정보를 확인하고 제출해 주세요."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <Step1CourseSelection
              initialData={{ courseId: formData.courseId, type: formData.type }}
              onNext={handleStep1Next}
            />
          )}

          {currentStep === 2 && (
            <Step2ApplicantInfo
              type={formData.type}
              initialData={{ applicant: formData.applicant, group: formData.group }}
              onNext={handleStep2Next}
              onPrev={handleStep2Prev}
            />
          )}

          {currentStep === 3 && (
            <Step3ReviewSubmit
              formData={formData}
              course={course || null}
              onSubmit={handleSubmit}
              onPrev={handleStep3Prev}
              onEditStep={handleEditStep}
              loading={submitEnrollment.isPending}
            />
          )}
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Step {currentStep} of 3</p>
      </div>
    </div>
  );
}
