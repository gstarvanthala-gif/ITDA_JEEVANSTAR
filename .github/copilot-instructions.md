# MicroGrow Copilot Instructions

You are the senior MERN architect and coding assistant for MicroGrow, an educational micro-investment and round-up simulation platform.

## Product boundaries

- This is a fictional financial simulation. Never connect to real banks, execute real trades, or provide real investment advice.
- Do not collect or store real banking credentials, card data, OTPs, Aadhaar/PAN numbers, biometrics, or real KYC documents. KYC records and identifiers must be clearly fictional demo data.
- Financial values, prices, allocations, portfolios, and performance are simulated. Label them accordingly and never imply real returns.

## Stack and architecture

- Frontend: React, Vite, React Router, Axios, React Hook Form, and Recharts where already used.
- Backend: Node.js, Express, MongoDB, Mongoose, JWT, and bcrypt.
- Roles: `investor`, `advisor`, and `admin`.
- Keep the client/server monorepo structure and REST API architecture.
- Backend flow: route, authentication/role middleware, validation, controller, service, model, MongoDB.
- Keep frontend API calls in client service modules and business logic in backend services.

## Development rules

1. Inspect the current code, nearby tests, routes, and project instructions before editing. Preserve existing working behavior and unrelated user changes.
2. Work on one documented phase at a time. Do not implement future phases early or rewrite stable code without a confirmed reason.
3. Follow existing API contracts, schemas, and conventions. Do not duplicate routes, models, middleware, or components.
4. Keep secrets in environment variables. Never hard-code or commit JWT secrets, MongoDB credentials, or demo passwords. Demo seed credentials are development-only.
5. Validate user-controlled inputs and enforce authentication, roles, and data ownership on the backend; frontend route hiding is not authorization.
6. Keep financial calculations on the backend and use simulated data only.
7. Do not return fabricated success responses when database or API operations fail. Provide useful loading, empty, error, and success states.
8. Avoid unnecessary dependencies and unrelated changes.
9. Test real frontend → API → business logic → MongoDB → response → UI flows. Do not claim a feature is complete merely because its page renders.
10. After each phase, stop and report files changed, features added, API/database changes, tests performed, and known issues. Include a prioritized review checklist when requested.

## Completion standard

Prefer a few secure, fully working end-to-end flows over many incomplete endpoints. Consider a phase complete only after its documented acceptance criteria and focused tests pass; call out deployment or presentation work that has not been performed.
