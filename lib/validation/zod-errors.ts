/**
 * @requirement REQ-114 - zod 3 → 4 upgrade (GHSA-mrhx-c7xc-m3w5)
 *
 * zod 4 removed the `required_error` option. Its replacement, `error`,
 * applies to every issue unless it is a function, so this helper keeps v3's
 * behaviour exactly: the custom message only when the value is missing
 * (`undefined`), and zod's own message for any other issue.
 */
export function requiredError(message: string) {
  return (issue: { input: unknown }) =>
    issue.input === undefined ? message : undefined;
}
