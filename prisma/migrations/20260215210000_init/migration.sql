-- CreateTable
CREATE TABLE "Link" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'homepage_hero',
    "ownerUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkClick" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "referrer" TEXT,
    "country" TEXT,

    CONSTRAINT "LinkClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitEvent" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Link_code_key" ON "Link"("code");

-- CreateIndex
CREATE INDEX "Link_createdAt_idx" ON "Link"("createdAt");

-- CreateIndex
CREATE INDEX "Link_ownerUserId_idx" ON "Link"("ownerUserId");

-- CreateIndex
CREATE INDEX "Link_isActive_expiresAt_idx" ON "Link"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "LinkClick_linkId_clickedAt_idx" ON "LinkClick"("linkId", "clickedAt");

-- CreateIndex
CREATE INDEX "LinkClick_clickedAt_idx" ON "LinkClick"("clickedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitEvent_key_endpoint_bucketStart_key" ON "RateLimitEvent"("key", "endpoint", "bucketStart");

-- CreateIndex
CREATE INDEX "RateLimitEvent_endpoint_bucketStart_idx" ON "RateLimitEvent"("endpoint", "bucketStart");

-- AddForeignKey
ALTER TABLE "LinkClick" ADD CONSTRAINT "LinkClick_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE CASCADE ON UPDATE CASCADE;
