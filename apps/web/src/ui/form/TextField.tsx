"use client";

import { forwardRef } from "react";
import { cx } from "../variants";
import { Field, inputClasses, type FieldProps } from "./Field";

type Common = Pick<FieldProps, "label" | "hint" | "error" | "hideLabel"> & { fieldClassName?: string };

export type TextFieldProps = Common & React.InputHTMLAttributes<HTMLInputElement>;

/** Spec 011, RF-4: campo de texto con etiqueta, ayuda y error. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField({ label, hint, error, hideLabel, fieldClassName, className, ...rest }, ref) {
  return (
    <Field label={label} hint={hint} error={error} hideLabel={hideLabel} className={fieldClassName}>
      {({ id, describedBy, invalid }) => (
        <input ref={ref} id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={cx(inputClasses, "h-10", className)} {...rest} />
      )}
    </Field>
  );
});

export type TextAreaProps = Common & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Spec 011, RF-4: área de texto. */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea({ label, hint, error, hideLabel, fieldClassName, className, rows = 3, ...rest }, ref) {
  return (
    <Field label={label} hint={hint} error={error} hideLabel={hideLabel} className={fieldClassName}>
      {({ id, describedBy, invalid }) => (
        <textarea ref={ref} id={id} rows={rows} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={cx(inputClasses, "py-2", className)} {...rest} />
      )}
    </Field>
  );
});
