"use client";

import { useCourse, useSubmitEnrollment } from "@/entities/enrollment";
import { useAuth } from "@/features/auth/model/auth-context";
import { ProtectedRoute } from "@/features/auth/ui/protected-route.ui";
import { useEnrollmentDraft } from "@/features/enrollment/lib/use-enrollment-draft";
import { useEnrollmentForm } from "@/features/enrollment/lib/use-enrollment-form";
import { StepIndicator } from "@/features/enrollment/ui/step-indicator.ui";
import { Step1CourseSelection } from "@/features/enrollment/ui/step1-course-selection.ui";
import { Step2ApplicantInfo } from "@/features/enrollment/ui/step2-applicant-info.ui";
import { Step3ReviewSubmit } from "@/features/enrollment/ui/step3-review-submit.ui";
import { SuccessScreen } from "@/features/enrollment/ui/success-screen.ui";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { AlertCircle, Shield } from "lucide-react";
import { useCallback, useEffect } from "react";

const STEPS = ["강의 선택", "정보 입력", "확인 및 제출"];
const STEP_DESCRIPTIONS = [
  "수강할 강의와 신청 유형을 선택해 주세요.",
  "신청자 정보를 입력해 주세요.",
  "입력하신 정보를 확인하고 제출해 주세요.",
];

const handleAdminRedirect = () => {
  window.location.href = "/admin";
};

const defaultFormData = {
  courseId: "",
  type: "personal" as const,
  applicant: {
    name: "",
    email: "",
    phone: "",
    motivation: "",
  },
  agreedToTerms: false,
};

function EnrollmentContent() {
  const { formData, setFormData, clearDraft } = useEnrollmentDraft(defaultFormData);
  const form = useEnrollmentForm();
  const { data: course } = useCourse(formData.courseId);
  const { hasRole } = useAuth();
  const submitEnrollment = useSubmitEnrollment();

  const handleReset = useCallback(
    () => form.handleReset(setFormData, clearDraft),
    [form, setFormData, clearDraft],
  );

  const handleSubmit = useCallback(
    () => form.handleSubmit(formData, clearDraft),
    [form, formData, clearDraft],
  );

  // Prevent leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (form.currentStep > 1 && !form.submitSuccess) {
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form.currentStep, form.submitSuccess]);

  if (form.submitSuccess) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <SuccessScreen
          response={form.submitSuccess}
          formData={formData}
          course={course || null}
          onReset={handleReset}
        />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold mb-2">수강 신청</h1>
            <p className="text-muted-foreground">원하는 강의를 선택하고 신청해 주세요</p>
          </div>
          {hasRole("CREATOR") && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdminRedirect}
              className="flex items-center gap-2 ml-4"
            >
              <Shield className="h-4 w-4" />
              관리자
            </Button>
          )}
        </div>
      </div>

      <StepIndicator currentStep={form.currentStep} totalSteps={3} stepLabels={STEPS} />

      {form.submitError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{form.submitError}</AlertDescription>
        </Alert>
      )}

      {form.fieldErrors && form.currentStep === 3 && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-1">
            {Object.entries(form.fieldErrors).map(([field, message]) => (
              <div key={field}>{message}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[form.currentStep - 1]}</CardTitle>
          <CardDescription>
            {STEP_DESCRIPTIONS[form.currentStep - 1]}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {form.currentStep === 1 ? (
            <Step1CourseSelection
              initialData={{ courseId: formData.courseId, type: formData.type }}
              onNext={(data) => form.handleStep1Next(formData, setFormData, data)}
            />
          ) : form.currentStep === 2 ? (
            <Step2ApplicantInfo
              type={formData.type}
              initialData={{ applicant: formData.applicant, group: formData.group }}
              onNext={(data) => form.handleStep2Next(setFormData, data)}
              onPrev={form.handleStep2Prev}
            />
          ) : (
            <Step3ReviewSubmit
              formData={formData}
              course={course || null}
              onSubmit={handleSubmit}
              onPrev={form.handleStep3Prev}
              onEditStep={form.handleEditStep}
              loading={submitEnrollment.isPending}
            />
          )}
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Step {form.currentStep} of 3</p>
      </div>
    </div>
  );
}

export default function EnrollmentPage() {
  return (
    <ProtectedRoute>
      <EnrollmentContent />
    </ProtectedRoute>
  );
}
