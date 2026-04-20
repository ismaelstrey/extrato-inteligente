You are a Senior Software Architect.

Design a production-ready SaaS system with the following requirements:

STACK:

* Next.js (App Router, fullstack)
* PostgreSQL
* Prisma ORM

SYSTEM:

* Multi-tenant (Admin → Client → Users)
* Authentication (email/password + 2FA via email)
* Session duration: 7 days
* Entities (e.g., Mercado Barato)
* Upload PDF (DO NOT store file)
* Extract text from PDF
* Identify bank via text identifier
* Apply dynamic regex templates from database
* Generate structured JSON transactions
* Store transactions in database
* Dashboard for financial visualization

CONSTRAINTS:

* Never store PDF files
* All queries must filter by client_id
* Prevent duplicate transactions
* Must be scalable

OUTPUT:

1. Prisma schema
2. Folder structure
3. API design
4. Data flow
5. Security model

Be precise and production-focused.
