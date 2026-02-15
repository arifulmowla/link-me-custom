import { db } from "@/lib/db";

type ConsumeRateLimitInput = {
  key: string;
  endpoint: string;
  limit: number;
  windowMs: number;
  now?: Date;
};

type ConsumeRateLimitResult = {
  allowed: boolean;
  retryAfterSec: number;
  hits: number;
};

export async function consumeRateLimit({
  key,
  endpoint,
  limit,
  windowMs,
  now = new Date(),
}: ConsumeRateLimitInput): Promise<ConsumeRateLimitResult> {
  const currentMs = now.getTime();
  const bucketStartMs = Math.floor(currentMs / windowMs) * windowMs;
  const bucketStart = new Date(bucketStartMs);

  const record = await db.rateLimitEvent.upsert({
    where: {
      key_endpoint_bucketStart: {
        key,
        endpoint,
        bucketStart,
      },
    },
    create: {
      key,
      endpoint,
      bucketStart,
      hits: 1,
    },
    update: {
      hits: {
        increment: 1,
      },
    },
    select: {
      hits: true,
    },
  });

  const retryAfterSec = Math.max(1, Math.ceil((bucketStartMs + windowMs - currentMs) / 1000));

  return {
    allowed: record.hits <= limit,
    retryAfterSec,
    hits: record.hits,
  };
}
