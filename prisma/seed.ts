import { PrismaClient } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Decimal = require('@prisma/client/runtime/library').Decimal;

const prisma = new PrismaClient();

const chains = [
  {
    id: 'polygon',
    name: 'Polygon',
    nativeToken: 'MATIC',
    usdcAddress: '0x0000000000000000000000000000000000001010',
    isActive: true,
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    nativeToken: 'ETH',
    usdcAddress: '0x000000000000000000000000000000000000cEeE',
    isActive: true,
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum One',
    nativeToken: 'ETH',
    usdcAddress: '0x000000000000000000000000000000000000aRb1',
    isActive: true,
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    nativeToken: 'AVAX',
    usdcAddress: '0x000000000000000000000000000000000000aVaX',
    isActive: true,
  },
  {
    id: 'base',
    name: 'Base',
    nativeToken: 'ETH',
    usdcAddress: '0x000000000000000000000000000000000000BaSe',
    isActive: true,
  },
];

const balances = [
  { userId: 'user_1', chainId: 'polygon', balance: new Decimal(250) },
  { userId: 'user_1', chainId: 'ethereum', balance: new Decimal(75.5) },
  { userId: 'user_1', chainId: 'arbitrum', balance: new Decimal(10) },
  { userId: 'user_1', chainId: 'avalanche', balance: new Decimal(150) },
  { userId: 'user_2', chainId: 'base', balance: new Decimal(25) },
  { userId: 'user_2', chainId: 'polygon', balance: new Decimal(12) },
];

async function main() {
  await prisma.transferStep.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.userChainBalance.deleteMany();
  await prisma.chain.deleteMany();

  for (const chain of chains) {
    await prisma.chain.create({ data: chain });
  }

  for (const balance of balances) {
    await prisma.userChainBalance.create({
      data: balance,
    });
  }
}

main()
  .catch((error) => {
    console.error('Seed error', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
