import z from 'zod';

const tooLongErrorMessage = (fieldName: string) =>
  `The ${fieldName} name is too long`;

export const errorMessages = {
  tooLong: (value: string) => tooLongErrorMessage(value),
  doesNotEndWithDash: "The name shouldn't end with a hyphen.",
  doesNotStartWithDash: "The name shouldn't start with a hyphen or a number.",
};

export const doesNotContainerAnythingButAlphanumericAndDash = /^[a-z0-9-]+$/;
export const doesNotStartWithDash = /^[^0-9-]/;
export const doesNotEndWithDash = /[^-]$/;

// TODO split message for exceed number message and alphanumeric symbols
// TODO check messages with Catalina

export const rfc_123_schema = (fieldName: string) =>
  z
    .string()
    .min(1)
    .max(63)
    .regex(
      doesNotContainerAnythingButAlphanumericAndDash,
      `The ${fieldName} should only contain lowercase letters, numbers and hyphens.`
    )
    .regex(doesNotEndWithDash, errorMessages.doesNotEndWithDash)
    .regex(doesNotStartWithDash, errorMessages.doesNotStartWithDash)
    .trim();
