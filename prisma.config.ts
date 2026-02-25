require("dotenv/config");

/** @type {import('prisma').PrismaConfigInput} */
module.exports = {
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.POSTGRES_URI,
  },
};
