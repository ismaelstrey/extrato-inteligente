import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const datasourceUrl = process.env.DATABASE_URL ?? "";
if (!datasourceUrl) throw new Error("DATABASE_URL não está configurado.");

const prisma = new PrismaClient({
  adapter: new PrismaNeon({
    connectionString: datasourceUrl,
  }),
});

const name = process.argv[2] ?? "Banrisul";
const t = await prisma.template.findFirst({
  where: { nome: name },
  select: { nome: true, identificador: true, regexData: true, regexValor: true, regexDescricao: true },
});

process.stdout.write(JSON.stringify(t, null, 2) + "\n");
await prisma.$disconnect();
