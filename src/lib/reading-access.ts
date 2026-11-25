import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { DomainSlot } from '../config/site.config.ts';

export interface TrialRecord {
  key: string;
  usedAt: string;
  domain: DomainSlot;
}

export interface PaidOrderRecord {
  orderId: string;
  domain: DomainSlot;
  tierId: string;
  amountThb: number;
  promptpayPayload: string;
  status: 'pending' | 'paid' | 'expired';
  createdAt: string;
  paidAt?: string;
  readingToken?: string;
  tokenRemainingUses: number;
  webhookEventId?: string;
}

export interface LedgerData {
  trialsByCookie: Record<string, TrialRecord>;
  trialsByIpHash: Record<string, TrialRecord>;
  trialsByUserId: Record<string, TrialRecord>;
  orders: Record<string, PaidOrderRecord>;
  processedWebhookEvents: Record<string, string>;
}

export interface PersistenceDriver {
  readLedger(): Promise<LedgerData>;
  writeLedger(data: LedgerData): Promise<void>;
}

const EMPTY_LEDGER: LedgerData = {
  trialsByCookie: {},
  trialsByIpHash: {},
  trialsByUserId: {},
  orders: {},
  processedWebhookEvents: {},
};

/**
 * Native open-source atomic JSON file persistence for Express/Node.
 * Swap with CloudflareKvDriver or CloudflareD1Driver when deploying to Cloudflare Workers.
 */
export class FileStoreDriver implements PersistenceDriver {
  private readonly filePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async readLedger(): Promise<LedgerData> {
    try {
      if (!fs.existsSync(this.filePath)) {
        return structuredClone(EMPTY_LEDGER);
      }
      const raw = await fs.promises.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<LedgerData>;
      return {
        trialsByCookie: parsed.trialsByCookie ?? {},
        trialsByIpHash: parsed.trialsByIpHash ?? {},
        trialsByUserId: parsed.trialsByUserId ?? {},
        orders: parsed.orders ?? {},
        processedWebhookEvents: parsed.processedWebhookEvents ?? {},
      };
    } catch {
      return structuredClone(EMPTY_LEDGER);
    }
  }

  async writeLedger(data: LedgerData): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      const dir = path.dirname(this.filePath);
      await fs.promises.mkdir(dir, { recursive: true });
      const tmp = `${this.filePath}.${crypto.randomBytes(6).toString('hex')}.tmp`;
      await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
      await fs.promises.rename(tmp, this.filePath);
    });
    await this.writeQueue;
  }
}

/**
 * Drop-in Cloudflare KV Persistence Adapter (zero external paid DB APIs).
 */
export interface CloudflareKVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export class CloudflareKvDriver implements PersistenceDriver {
  private readonly kv: CloudflareKVLike;
  private readonly ledgerKey: string;

  constructor(kv: CloudflareKVLike, ledgerKey = 'pilgrim:ledger:v1') {
    this.kv = kv;
    this.ledgerKey = ledgerKey;
  }

  async readLedger(): Promise<LedgerData> {
    const raw = await this.kv.get(this.ledgerKey);
    if (!raw) return structuredClone(EMPTY_LEDGER);
    const parsed = JSON.parse(raw) as Partial<LedgerData>;
    return {
      trialsByCookie: parsed.trialsByCookie ?? {},
      trialsByIpHash: parsed.trialsByIpHash ?? {},
      trialsByUserId: parsed.trialsByUserId ?? {},
      orders: parsed.orders ?? {},
      processedWebhookEvents: parsed.processedWebhookEvents ?? {},
    };
  }

  async writeLedger(data: LedgerData): Promise<void> {
    await this.kv.put(this.ledgerKey, JSON.stringify(data));
  }
}

const EPHEMERAL_SIGNING_SECRET = crypto.randomBytes(32).toString('hex');
const EPHEMERAL_IP_SALT = crypto.randomBytes(24).toString('hex');

function getSigningSecret(): string {
  return process.env.TOKEN_SIGNING_SECRET?.trim() || EPHEMERAL_SIGNING_SECRET;
}

function getIpSalt(): string {
  return process.env.IP_HASH_SALT?.trim() || EPHEMERAL_IP_SALT;
}

export function hashClientIp(ip: string): string {
  return crypto.createHmac('sha256', getIpSalt()).update(ip || 'unknown').digest('hex');
}

export function signTokenPayload(payload: object): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSigningSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySignedToken<T = Record<string, unknown>>(token: string): T | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expected = crypto.createHmac('sha256', getSigningSecret()).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

export class ReadingAccessManager {
  private readonly driver: PersistenceDriver;

  constructor(driver?: PersistenceDriver) {
    const defaultFile = path.resolve(process.cwd(), '.data', 'pilgrim-ledger.json');
    this.driver = driver ?? new FileStoreDriver(defaultFile);
  }

  async checkTrialAvailable(params: {
    cookieTrialId?: string | null;
    ipHash: string;
    userId?: string | null;
  }): Promise<boolean> {
    const ledger = await this.driver.readLedger();
    if (params.cookieTrialId && ledger.trialsByCookie[params.cookieTrialId]) return false;
    if (ledger.trialsByIpHash[params.ipHash]) return false;
    if (params.userId && ledger.trialsByUserId[params.userId]) return false;
    return true;
  }

  async consumeTrial(params: {
    cookieTrialId: string;
    ipHash: string;
    userId?: string | null;
    domain: DomainSlot;
  }): Promise<void> {
    const ledger = await this.driver.readLedger();
    const record: TrialRecord = {
      key: params.cookieTrialId,
      usedAt: new Date().toISOString(),
      domain: params.domain,
    };
    ledger.trialsByCookie[params.cookieTrialId] = record;
    ledger.trialsByIpHash[params.ipHash] = record;
    if (params.userId) {
      ledger.trialsByUserId[params.userId] = record;
    }
    await this.driver.writeLedger(ledger);
  }

  async createOrder(order: Omit<PaidOrderRecord, 'status' | 'createdAt' | 'tokenRemainingUses'>): Promise<PaidOrderRecord> {
    const ledger = await this.driver.readLedger();
    const fullOrder: PaidOrderRecord = {
      ...order,
      status: 'pending',
      createdAt: new Date().toISOString(),
      tokenRemainingUses: 0,
    };
    ledger.orders[order.orderId] = fullOrder;
    await this.driver.writeLedger(ledger);
    return fullOrder;
  }

  async getOrder(orderId: string): Promise<PaidOrderRecord | null> {
    const ledger = await this.driver.readLedger();
    return ledger.orders[orderId] ?? null;
  }

  async markOrderPaidIdempotent(params: {
    orderId: string;
    webhookEventId: string;
  }): Promise<PaidOrderRecord | null> {
    const ledger = await this.driver.readLedger();
    if (ledger.processedWebhookEvents[params.webhookEventId]) {
      const existingOrderId = ledger.processedWebhookEvents[params.webhookEventId];
      return ledger.orders[existingOrderId] ?? null;
    }

    const order = ledger.orders[params.orderId];
    if (!order) return null;

    if (order.status !== 'paid') {
      const readingToken = signTokenPayload({
        orderId: order.orderId,
        domain: order.domain,
        tierId: order.tierId,
        iat: Date.now(),
      });
      order.status = 'paid';
      order.paidAt = new Date().toISOString();
      order.readingToken = readingToken;
      order.tokenRemainingUses = 1;
      order.webhookEventId = params.webhookEventId;
    }

    ledger.processedWebhookEvents[params.webhookEventId] = order.orderId;
    ledger.orders[order.orderId] = order;
    await this.driver.writeLedger(ledger);
    return order;
  }

  async consumePaidToken(readingToken: string): Promise<{ valid: boolean; tierId?: string; orderId?: string }> {
    const claims = verifySignedToken<{ orderId: string; tierId: string }>(readingToken);
    if (!claims?.orderId) return { valid: false };

    const ledger = await this.driver.readLedger();
    const order = ledger.orders[claims.orderId];
    if (!order || order.status !== 'paid' || order.readingToken !== readingToken || order.tokenRemainingUses <= 0) {
      return { valid: false };
    }

    order.tokenRemainingUses -= 1;
    ledger.orders[order.orderId] = order;
    await this.driver.writeLedger(ledger);
    return { valid: true, tierId: order.tierId, orderId: order.orderId };
  }
}
