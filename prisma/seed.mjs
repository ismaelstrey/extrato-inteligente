import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email = process.env.SEED_USER_EMAIL ?? "demo@extrato.local";
const password = process.env.SEED_USER_PASSWORD ?? "demo123";
const clientName = process.env.SEED_CLIENT_NAME ?? "Cliente Demo";
const entityName = process.env.SEED_ENTITY_NAME ?? "Empresa Demo";

const templateName = process.env.SEED_TEMPLATE_NAME ?? "PagSeguro";
const templateIdentifier = process.env.SEED_TEMPLATE_IDENTIFIER ?? "PagSeguro";

const regexData = process.env.SEED_REGEX_DATA ?? "(\\d{2}\\/\\d{2}\\/\\d{4})";
const regexValor =
  process.env.SEED_REGEX_VALOR ??
  "(-?\\(?\\d{1,3}(?:\\.\\d{3})*(?:,\\d{2})\\)?)";
const regexDescricao =
  process.env.SEED_REGEX_DESCRICAO ??
  "(?:\\d{2}\\/\\d{2}\\/\\d{4})\\s+(.+?)\\s+(-?\\(?\\d{1,3}(?:\\.\\d{3})*(?:,\\d{2})\\)?)$";

async function main() {
  const passwordHash = await bcrypt.hash(password, 10);

  const client =
    (await prisma.client.findFirst({ where: { nome: clientName } })) ??
    (await prisma.client.create({ data: { nome: clientName } }));

  await prisma.user.upsert({
    where: { email },
    update: {
      clientId: client.id,
      role: "CLIENT_ADMIN",
      passwordHash,
      active: true,
    },
    create: {
      email,
      name: "Demo Admin",
      clientId: client.id,
      role: "CLIENT_ADMIN",
      passwordHash,
      active: true,
    },
  });

  const entityExists = await prisma.entity.findFirst({
    where: { clientId: client.id, nome: entityName },
    select: { id: true },
  });

  if (!entityExists) {
    await prisma.entity.create({
      data: {
        nome: entityName,
        clientId: client.id,
      },
    });
  }

  const templateExists = await prisma.template.findFirst({
    where: { clientId: client.id, nome: templateName },
    select: { id: true },
  });

  if (!templateExists) {
    await prisma.template.create({
      data: {
        nome: templateName,
        identificador: templateIdentifier,
        regexData,
        regexValor,
        regexDescricao,
        clientId: client.id,
      },
    });
  } else {
    await prisma.template.update({
      where: { id: templateExists.id },
      data: {
        identificador: templateIdentifier,
        regexData,
        regexValor,
        regexDescricao,
      },
    });
  }

  console.log("Seed concluído:");
  console.log(`- Email: ${email}`);
  console.log(`- Senha: ${password}`);
  console.log(`- Client: ${clientName}`);
  console.log(`- Template identificador: ${templateIdentifier}`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
