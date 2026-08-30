// Local-only loader fixture: no database connection or credentials are used.
export default {
  schema: '../../../prisma/schema.prisma',
  migrations: { path: '../../../prisma/migrations' },
};
