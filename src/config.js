module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/prtd'
};
