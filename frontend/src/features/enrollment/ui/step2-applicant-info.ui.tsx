"use client";

import type { ApplicantInfo, EnrollmentType, GroupInfo } from "@/entities/enrollment";
import { Button } from "@/shared/ui/button";
import { useState } from "react";
import { z } from "zod";
import {
  applicantSchema,
  formatZodErrors,
  step2GroupSchema,
  step2PersonalSchema,
} from "../lib/validation.lib";
import { ApplicantFields } from "./applicant-fields.ui";
import { GroupFields } from "./group-fields.ui";

interface Step2Props {
  type: EnrollmentType;
  initialData: { applicant: ApplicantInfo; group?: GroupInfo };
  onNext: (data: { applicant: ApplicantInfo; group?: GroupInfo }) => void;
  onPrev: () => void;
}

export function Step2ApplicantInfo({ type, initialData, onNext, onPrev }: Step2Props) {
  const [applicant, setApplicant] = useState<ApplicantInfo>(initialData.applicant);
  const [group, setGroup] = useState<GroupInfo>(initialData.group || getDefaultGroup());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function getDefaultGroup(): GroupInfo {
    return {
      organizationName: "",
      headCount: 2,
      participants: [
        { name: "", email: "" },
        { name: "", email: "" },
      ],
      contactPerson: "",
    };
  }

  const validateForm = (): boolean => {
    try {
      if (type === "personal") step2PersonalSchema.parse({ applicant });
      else step2GroupSchema.parse({ applicant, group });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors(formatZodErrors(err));
      }
      return false;
    }
  };

  const handleNext = () => {
    if (validateForm()) onNext({ applicant, group: type === "group" ? group : undefined });
  };

  const handleApplicantChange = (field: keyof ApplicantInfo, value: string) => {
    setApplicant((prev) => ({ ...prev, [field]: value }));
    if (touched[`applicant.${field}`]) validateField(`applicant.${field}`, value);
  };

  const handleApplicantBlur = (field: keyof ApplicantInfo) => {
    setTouched((prev) => ({ ...prev, [`applicant.${field}`]: true }));
    validateField(`applicant.${field}`, applicant[field]);
  };

  const validateField = (field: string, value: unknown) => {
    try {
      const fieldName = field.replace("applicant.", "");
      const schema = applicantSchema.shape[fieldName as keyof ApplicantInfo];
      if (schema) schema.parse(value);
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      return true;
    } catch (err) {
      if (err instanceof z.ZodError)
        setErrors((prev) => ({ ...prev, [field]: err.errors[0]?.message }));
      return false;
    }
  };

  const handleGroupChange = (field: keyof GroupInfo, value: string | number) => {
    setGroup((prev) => ({ ...prev, [field]: value }));
    if (field === "headCount") adjustParticipants(value as number);
  };

  const adjustParticipants = (count: number) => {
    setGroup((prev) => {
      const current = prev.participants.length;
      if (count > current)
        return {
          ...prev,
          participants: [
            ...prev.participants,
            ...Array.from({ length: count - current }, () => ({ name: "", email: "" })),
          ],
        };
      if (count < current) return { ...prev, participants: prev.participants.slice(0, count) };
      return prev;
    });
  };

  const handleParticipantChange = (index: number, field: "name" | "email", value: string) => {
    setGroup((prev) => ({
      ...prev,
      participants: prev.participants.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    }));
  };

  const addParticipant = () => {
    if (group.participants.length < 10)
      setGroup((prev) => ({
        ...prev,
        participants: [...prev.participants, { name: "", email: "" }],
      }));
  };
  const removeParticipant = (index: number) => {
    if (group.participants.length > 2)
      setGroup((prev) => ({
        ...prev,
        participants: prev.participants.filter((_, i) => i !== index),
      }));
  };

  const getFieldError = (field: string) => errors[field];

  return (
    <div className="space-y-6">
      <ApplicantFields
        applicant={applicant}
        errors={errors}
        touched={touched}
        onChange={handleApplicantChange}
        onBlur={handleApplicantBlur}
      />
      {type === "group" && (
        <GroupFields
          group={group}
          errors={errors}
          onChange={handleGroupChange}
          onParticipantChange={handleParticipantChange}
          onAddParticipant={addParticipant}
          onRemoveParticipant={removeParticipant}
        />
      )}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev} size="lg">
          이전 단계
        </Button>
        <Button onClick={handleNext} size="lg">
          다음 단계
        </Button>
      </div>
    </div>
  );
}
