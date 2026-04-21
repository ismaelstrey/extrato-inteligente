import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({
    connectionString: process.env.DATABASE_URL ?? "",
  }),
});

const name = process.argv[2] ?? "Banrisul";
const t = await prisma.template.findFirst({
  where: { nome: name },
  select: { nome: true, identificador: true, regexData: true, regexValor: true, regexDescricao: true },
});

process.stdout.write(JSON.stringify(t, null, 2) + "\n");
await prisma.$disconnect();
