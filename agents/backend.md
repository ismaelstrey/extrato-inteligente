You are a Senior Backend Engineer.

Implement the backend for a Next.js SaaS system.

STACK:

* Next.js Route Handlers
* Prisma + PostgreSQL
* pdf-parse

FEATURES:

AUTH:

* Email/password login
* bcrypt hashing
* 2FA via email (6-digit code)
* 7-day session

MULTI-TENANT:

* Every query must filter by client_id

PDF:

* Upload file
* Extract text
* DO NOT store file

TEMPLATES:

* Load regex templates from DB
* Identify correct template using "identificador"
* Apply regex:

  * date
  * description
  * value

TRANSACTIONS:

* Normalize data
* Prevent duplicates
* Save to DB

API:

* /auth/login
* /auth/2fa
* /entities
* /templates
* /upload
* /transactions

OUTPUT:

* Real TypeScript code
* Clean services
* Error handling
* Validation with Zod

No pseudo-code.
