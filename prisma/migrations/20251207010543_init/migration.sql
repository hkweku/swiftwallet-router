-- CreateTable
CREATE TABLE "Chain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nativeToken" TEXT NOT NULL,
    "usdcAddress" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "UserChainBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "balance" DECIMAL NOT NULL,
    CONSTRAINT "UserChainBalance_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Chain" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TransferStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "feeUsd" DECIMAL NOT NULL,
    "txId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    CONSTRAINT "TransferStep_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransferStep_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Chain" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserChainBalance_userId_chainId_key" ON "UserChainBalance"("userId", "chainId");
