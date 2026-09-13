# Debug Workflow

When debugging a feature:

1. Reproduce the problem.
2. Identify whether it is frontend, API, authorization, business logic, database, provider, or deployment.
3. Trace the request end-to-end.
4. Inspect logs using correlation/request IDs where available.
5. Check tenant and permission context first for access-related issues.
6. Identify the smallest root cause.
7. Fix the root cause rather than masking the symptom.
8. Add a regression test.
9. Run the relevant test suite.
10. Review the final diff.

Do not perform broad rewrites during a focused debugging task.
