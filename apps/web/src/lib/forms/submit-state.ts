/**
 * After a successful submit that navigates away, keep `isSubmitting` true until the page unmounts.
 * Call this from `catch` blocks (and validation early-returns), not from `finally`.
 */
export function resetSubmitting(setIsSubmitting: (value: boolean) => void): void {
  setIsSubmitting(false);
}
