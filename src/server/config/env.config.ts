/**
 * Environment configuration
 * Loads and validates required environment variables
 */

export const ENV_CONFIG = {
  PACKAGE_NAME: process.env.PACKAGE_NAME ?? (() => {
    throw new Error("PACKAGE_NAME is not set in .env file");
  })(),

  MENTRAOS_API_KEY: process.env.MENTRAOS_API_KEY ?? (() => {
    throw new Error("MENTRAOS_API_KEY is not set in .env file");
  })(),

  PORT: process.env.PORT ? parseInt(process.env.PORT) : 80,
};
