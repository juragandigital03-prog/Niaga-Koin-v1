-- CreateEnum
CREATE TYPE "BotStatus" AS ENUM ('stopped', 'active', 'paused');

-- CreateEnum
CREATE TYPE "StrategyType" AS ENUM ('rsi');

-- CreateTable
CREATE TABLE "bots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exchange_account_id" TEXT,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "strategy_type" "StrategyType" NOT NULL,
    "parameters" JSONB NOT NULL,
    "risk_limits" JSONB NOT NULL,
    "status" "BotStatus" NOT NULL DEFAULT 'stopped',
    "is_paper" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bots_user_id_idx" ON "bots"("user_id");

-- AddForeignKey
ALTER TABLE "bots" ADD CONSTRAINT "bots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bots" ADD CONSTRAINT "bots_exchange_account_id_fkey" FOREIGN KEY ("exchange_account_id") REFERENCES "exchange_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
