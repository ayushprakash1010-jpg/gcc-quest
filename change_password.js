const { PrismaClient } = require("./node_modules/@prisma/client");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");

// Explicitly load .env from root
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = "admin@gccquest.com";
  const newPassword = "GccQuest@2026!";

  const passwordHash = await bcrypt.hash(newPassword, 10);

  const updatedUser = await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  console.log(
    `Password updated successfully in DB: ${process.env.DATABASE_URL}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
