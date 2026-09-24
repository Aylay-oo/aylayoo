export type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
  RATE_LIMIT: KVNamespace;
  JWT_SECRET: string;
  ALLOWED_ORIGINS: string;
};

export type AppEnv = {
  Bindings: Env;
  Variables: { adminId: number };
};
