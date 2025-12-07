# SwiftWallet Routing Engine for BMONI

A backend system that abstracts multi-chain USDC transfers by unifying balances across chains, automatically selecting the best blockchain for each transfer, and bridging funds when needed.

## Project Overview

The SwiftWallet Routing Engine is a modular NestJS monolith designed to:

- **Unify USDC balances** across multiple blockchains (Polygon, Ethereum, Arbitrum ,etc)
- **Automatically select** the optimal blockchain for each transfer based on gas fees and confirmation times
- **Bridge funds** between chains when necessary
- **Execute transfers** through a mock blockchain interface
- **Return clear routing decisions** with fees and confirmation estimates

The system is intentionally structured around microservice-oriented boundaries, making it easy to extract into separate services in production.

## Tech Stack

- **NestJS** (v11) - Progressive Node.js framework
- **TypeScript** - Type-safe development
- **Prisma ORM** - Database toolkit
- **SQLite** - Simple database for development (production would use PostgreSQL)
- **Jest** - Testing framework
- **Swagger/OpenAPI** - Auto-generated API documentation

## Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database with initial data
npm run db:seed
```

## Running Locally

```bash
# Development mode (with hot reload)
npm run start:dev

# Production mode
npm run start:prod
```

The server will start on `http://localhost:3000` (or the port specified in `PORT` environment variable).

- **API Base URL**: `http://localhost:3000/api`
- **Swagger Documentation**: `http://localhost:3000/docs`

## API Endpoints

### GET `/api/users/:userId/balance`

Returns the unified USDC balance across all chains for a user.

**Response:**

```json
{
  "userId": "user_1",
  "totalUsdValue": 335.5,
  "perChain": [
    { "chain": "polygon", "balance": "250.0" },
    { "chain": "ethereum", "balance": "75.5" },
    { "chain": "arbitrum", "balance": "10.0" }
  ]
}
```

### POST `/api/transfers`

Creates a new USDC transfer between users, automatically routing through the optimal chain.

**Request:**

```json
{
  "fromUserId": "user_1",
  "toUserId": "user_2",
  "amount": "50"
}
```

**Response:**

```json
{
  "transferId": "abc-123-def-456",
  "route": {
    "sourceChain": "polygon",
    "destinationChain": "polygon",
    "needsBridge": false,
    "steps": [
      {
        "type": "transfer",
        "chainId": "polygon",
        "amount": "50",
        "estimatedFeeUsd": 0.005,
        "estimatedConfirmationMs": 30000
      }
    ],
    "reason": "lowest gas + sufficient balance"
  }
}
```

### GET `/api/chains`

Returns all available blockchain networks.

### GET `/api/chains/:chainId`

Returns details for a specific chain.

## Routing Algorithm

The routing engine uses a sophisticated scoring algorithm to select the optimal transfer path:

### Step 1: Load Data

- Fetch user balances across all chains
- Get current gas prices and confirmation times from the gas oracle

### Step 2: Direct Chain Candidates

A chain qualifies for direct transfer if:

- User balance on chain ≥ transfer amount
- Chain is active (`isActive === true`)

### Step 3: Scoring Direct Chains

If multiple chains have sufficient balance, the system scores each using:

```
score = (gasFeeUsd × 0.7) + (confirmationTimeMs / 1000 × 0.3)
```

The chain with the **lowest score** is selected.

### Step 4: Bridging Evaluation

If no single chain has sufficient balance, the system evaluates bridging:

For every source chain with balance > 0, combined with every possible destination chain:

- Calculate bridge fee (USD)
- Calculate transfer fee (USD)
- Calculate total time = bridge time + confirmation time
- Compute combined score

The path with the **lowest combined score** is selected.

### Step 5: Route Decision

The system returns a `RouteDecision` with:

- Source and destination chains
- Whether bridging is needed
- Step-by-step execution plan
- Estimated fees and confirmation times
- Human-readable reason for the selection

## Transfer Execution Flow

1. **Validation**: DTO validation and balance checks
2. **Routing**: Determine optimal transfer path
3. **Persistence**: Create transfer and step records (status: `pending`)
4. **Execution**: Execute steps sequentially:
   - If bridging needed: Bridge funds → update balances → mark step complete
   - Transfer funds → update balances → mark step complete
5. **Completion**: Update transfer status to `completed`
6. **Response**: Return transfer details with routing information

## Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run end-to-end tests
npm run test:e2e
```

## Database

The project uses SQLite for simplicity in development. The database schema includes:

- **Chain**: Blockchain network information
- **UserChainBalance**: User balances per chain
- **Transfer**: Transfer records
- **TransferStep**: Individual steps within a transfer (bridge/transfer operations)

To view the database:

```bash
npm run prisma:studio
```

## Assumptions

1. **USDC is fungible** across all supported chains
2. **Gas prices** are provided by the gas oracle service (currently mocked)
3. **Bridge fees** are fixed per chain pair (currently mocked)
4. **Transfer amounts** are in USDC (not native tokens)
5. **Balances** are pre-existing and managed externally
6. **Blockchain operations** are simulated with random latency (300-1200ms)

## Scoring Model Rationale

To pick the best chain when more than one option is available, I use a simple weighted score:

```
score = (gasFeeUsd × 0.7) + ((confirmationTimeMs / 1000) × 0.3)
```

Cost gets a higher weight (70%) because users usually care more about paying less in gas fees.
Confirmation time still matters (30%), but a few extra seconds is normally fine if the transaction is cheaper.

I divide confirmation time by 1000 just to convert milliseconds into seconds so the numbers stay reasonable.

This formula is basic and in a real system the weights could be adjusted or replaced with actual gas-price and network-speed data.

## SQLite Justification

SQLite is used for this take-home assessment to:

- **Simplify setup** - No database server required
- **Quick iteration** - Easy to reset and reseed
- **Portability** - Single file database
- **Production readiness** - The Prisma schema and code are designed to work seamlessly with PostgreSQL in production

In production, you would:

1. Change the database URL in `.env` to a PostgreSQL connection string
2. Run `prisma migrate deploy` (no code changes needed)
3. The application will work identically

## Future Evolution to Microservices

This project is implemented as a clean modular monolith for simplicity, but the domain boundaries map directly to microservices. For example:

- **Routing** → Payments Orchestrator Service
- **Balances** → Wallet / Ledger Service
- **Gas Oracle** → Pricing/Fees Service
- **Blockchain** → Chain Connector Service

In a production environment, these modules could be extracted behind an API Gateway, communicating via HTTP or a message bus (e.g., RabbitMQ, Kafka). The current module boundaries and dependency injection structure make this migration straightforward.

## Project Structure

```
src/
├── app.module.ts              # Root module
├── main.ts                    # Application entry point
├── chains/                    # Chain management
│   ├── chains.module.ts
│   ├── chains.service.ts
│   ├── chains.controller.ts
│   ├── entities/
│   └── dtos/
├── balances/                  # Balance management
│   ├── balances.module.ts
│   ├── balances.service.ts
│   ├── balances.controller.ts
│   ├── entities/
│   └── dtos/
├── gas-oracle/               # Gas price oracle
│   ├── gas-oracle.module.ts
│   ├── gas-oracle.service.ts
│   └── interfaces/
├── routing/                  # Routing algorithm
│   ├── routing.module.ts
│   ├── routing.service.ts
│   ├── interfaces/
│   └── utils/
├── blockchain/              # Mock blockchain interface
│   ├── blockchain.module.ts
│   ├── blockchain.service.ts
│   └── interfaces/
├── transfers/               # Transfer execution
│   ├── transfers.module.ts
│   ├── transfers.service.ts
│   ├── transfers.controller.ts
│   ├── entities/
│   └── dtos/
├── prisma/                  # Prisma service
│   ├── prisma.module.ts
│   └── prisma.service.ts
└── common/                  # Shared utilities
    ├── exceptions/
    ├── utils/
    ├── constants/
    └── dtos/
```

## Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="file:./dev.db"
PORT=3000
```

## License

This project is part of a take-home assessment for BMONI and is not licensed for production use.
