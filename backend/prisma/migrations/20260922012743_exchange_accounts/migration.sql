-- CreateEnum
CREATE TYPE "ExchangeConnectionStatus" AS ENUM ('connected', 'failed');

-- CreateTable
CREATE TABLE "exchange_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exchange_name" TEXT NOT NULL,
    "connection_status" "ExchangeConnectionStatus" NOT NULL,
    "connected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_credentials" (
    "id" TEXT NOT NULL,
    "exchange_account_id" TEXT NOT NULL,
    "encrypted_api_key" TEXT NOT NULL,
    "encrypted_api_secret" TEXT NOT NULL,
    "permission_scope" TEXT NOT NULL,
    "rotated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exchange_accounts_user_id_idx" ON "exchange_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_credentials_exchange_account_id_key" ON "api_credentials"("exchange_account_id");

-- AddForeignKey
ALTER TABLE "exchange_accounts" ADD CONSTRAINT "exchange_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_credentials" ADD CONSTRAINT "api_credentials_exchange_account_id_fkey" FOREIGN KEY ("exchange_account_id") REFERENCES "exchange_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
