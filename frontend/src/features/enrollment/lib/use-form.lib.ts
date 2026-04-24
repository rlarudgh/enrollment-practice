import { useCallback, useRef, useState } from "react";
import { z } from "zod";

interface UseFormOptions<T> {
  defaultValues: T;
  schema?: z.ZodSchema<T>;
}

interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
}

interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: keyof T, error: string) => void;
  clearError: (field: keyof T) => void;
  handleChange: (field: keyof T) => (value: T[keyof T]) => void;
  handleBlur: (field: keyof T) => () => void;
  validate: () => boolean;
  validateField: (field: keyof T) => boolean;
  reset: () => void;
}

export function useForm<T extends Record<string, unknown>>(
  options: UseFormOptions<T>
): UseFormReturn<T> {
  const { defaultValues, schema } = options;

  const [formState, setFormState] = useState<FormState<T>>({
    values: defaultValues,
    errors: {},
    touched: {},
    isValid: false,
  });

  const formStateRef = useRef(formState);
  formStateRef.current = formState;

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormState((prev) => ({
      ...prev,
      values: { ...prev.values, [field]: value },
    }));
  }, []);

  const setValues = useCallback((values: Partial<T>) => {
    setFormState((prev) => ({
      ...prev,
      values: { ...prev.values, ...values },
    }));
  }, []);

  const setError = useCallback((field: keyof T, error: string) => {
    setFormState((prev) => ({
      ...prev,
      errors: { ...prev.errors, [field]: error },
    }));
  }, []);

  const clearError = useCallback((field: keyof T) => {
    setFormState((prev) => {
      const newErrors = { ...prev.errors };
      delete newErrors[field];
      return { ...prev, errors: newErrors };
    });
  }, []);

  const handleChange = useCallback(
    (field: keyof T) => (value: T[keyof T]) => {
      setValue(field, value as T[typeof field]);
      if (formStateRef.current.touched[field]) {
        validateField(field);
      }
    },
    [setValue]
  );

  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setFormState((prev) => ({
        ...prev,
        touched: { ...prev.touched, [field]: true },
      }));
      validateField(field);
    },
    []
  );

  const validateField = useCallback(
    (field: keyof T): boolean => {
      if (!schema) return true;

      try {
        const fieldSchema =
          schema instanceof z.ZodObject
            ? (schema as z.ZodObject<Record<string, z.ZodType<unknown>>>).shape[field as string]
            : null;

        if (!fieldSchema) return true;

        const value = formStateRef.current.values[field];
        fieldSchema.parse(value);

        setFormState((prev) => {
          const newErrors = { ...prev.errors };
          delete newErrors[field];
          return { ...prev, errors: newErrors };
        });

        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const message = error.errors[0]?.message || "Invalid value";
          setError(field, message);
        }
        return false;
      }
    },
    [schema, setError]
  );

  const validate = useCallback((): boolean => {
    if (!schema) {
      setFormState((prev) => ({ ...prev, isValid: true }));
      return true;
    }

    try {
      schema.parse(formStateRef.current.values);
      setFormState((prev) => ({ ...prev, errors: {}, isValid: true }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Partial<Record<keyof T, string>> = {};
        error.errors.forEach((err) => {
          const path = err.path[0] as keyof T;
          if (!errors[path]) {
            errors[path] = err.message;
          }
        });
        setFormState((prev) => ({ ...prev, errors, isValid: false }));
      }
      return false;
    }
  }, [schema]);

  const reset = useCallback(() => {
    setFormState({
      values: defaultValues,
      errors: {},
      touched: {},
      isValid: false,
    });
  }, [defaultValues]);

  return {
    values: formState.values,
    errors: formState.errors,
    touched: formState.touched,
    isValid: formState.isValid,
    setValue,
    setValues,
    setError,
    clearError,
    handleChange,
    handleBlur,
    validate,
    validateField,
    reset,
  };
}
