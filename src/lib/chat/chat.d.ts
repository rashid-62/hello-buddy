declare module "*/chat/chatHandler.js" {
  export function handleChat(body: unknown): Promise<{ statusCode: number; payload: unknown }>;
}

declare module "*/chat/utils/rateLimit.js" {
  export function checkRateLimit(clientId: string): { allowed: boolean; retryAfterSec?: number };
  export const MAX_REQUESTS: number;
  export const WINDOW_MS: number;
}
