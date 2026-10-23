declare module "webpush-webcrypto" {
  export interface ApplicationServerKeysLike {
    fromJSON(json: { publicKey?: string; privateKey?: string }): Promise<unknown>;
  }
  export const ApplicationServerKeys: {
    fromJSON(json: { publicKey?: string; privateKey?: string }): Promise<unknown>;
  };
  export function generatePushHTTPRequest(options: {
    applicationServerKeys: unknown;
    payload: string;
    target: { endpoint: string; keys: { p256dh: string; auth: string } };
    adminContact?: string;
    ttl?: number;
    urgency?: "high" | "normal" | "low";
  }): Promise<{ endpoint: string; body: BodyInit; headers: Record<string, string> }>;
}
