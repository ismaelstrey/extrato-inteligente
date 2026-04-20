## Extrato Inteligente

SaaS multi-tenant para contadores que automatiza a extração e validação de dados contábeis a partir de extratos bancários em PDF, reduzindo trabalho manual e erros.

## Documentação

- Plano do produto: [docs/PRODUCT_PLAN.md](file:///d:/DEV/extrato-inteligente/docs/PRODUCT_PLAN.md)
- Proposta de evolução do banco: [docs/DATABASE.md](file:///d:/DEV/extrato-inteligente/docs/DATABASE.md)
- Qualidade (99%) e UX de revisão: [docs/QUALITY_AND_UX.md](file:///d:/DEV/extrato-inteligente/docs/QUALITY_AND_UX.md)

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Banco de Dados (Prisma)

Este projeto usa Prisma 7 com `prisma.config.ts` para configurar `DATABASE_URL` para migrations/seed:

- Config Prisma CLI: [prisma.config.ts](file:///d:/DEV/extrato-inteligente/prisma.config.ts)
- Schema: [schema.prisma](file:///d:/DEV/extrato-inteligente/prisma/schema.prisma)

Scripts úteis:

```bash
npm run db:migrate
npm run db:seed
npm run db:migrate:deploy
npm run db:studio
```

Em deploy (ex.: Vercel), configure a variável de ambiente `DATABASE_URL` no projeto. Um exemplo de formato está em [.env.example](file:///d:/DEV/extrato-inteligente/.env.example).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
