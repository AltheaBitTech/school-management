# Create Module

Before creating a new module:

1. Identify whether the capability already exists.
2. Read the relevant architecture/domain document.
3. Define ownership and dependencies.
4. Define required database entities.
5. Define permissions.
6. Define API boundaries.
7. Define frontend workflows.
8. Define tests.

Create the smallest module consistent with existing project structure.

Do not add Redis, queues, microservices, or new providers unless the requirement justifies them.

Finish with a checklist of:
- module
- DB
- API
- auth
- frontend
- tests
- docs
