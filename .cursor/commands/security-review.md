# Security Review

Perform a focused security review of the selected feature.

Trace:

Authentication
→ Organization
→ Permission
→ Resource authorization
→ Business validation
→ Database query

Check:

- Cross-tenant access
- IDOR/BOLA
- Privilege escalation
- Mass assignment
- Unsafe file access
- Sensitive data exposure
- Input validation
- Rate limiting where relevant
- Token/session handling
- Audit requirements

For each finding include:
- Risk
- Evidence
- Impact
- Recommended fix
