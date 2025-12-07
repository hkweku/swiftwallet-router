import { Test } from '@nestjs/testing';
import { RoutingService } from './routing.service';
import { BalancesService } from '../balances/balances.service';
import { GasOracleService } from '../gas-oracle/gas-oracle.service';
import { ChainsService } from '../chains/chains.service';
import { toDecimal } from '../common/utils/decimal.utils';

describe('RoutingService', () => {
  let service: RoutingService;
  const balancesService = {
    getUserBalances: jest.fn(),
  };
  const gasOracleService = {
    getGasInfo: jest.fn(),
  };
  const chainsService = {
    findActive: jest.fn(),
  };

  const gasInfo = [
    {
      chainId: 'polygon',
      gasFeeUsd: 0.01,
      confirmationMs: 30_000,
      bridgeFeeUsd: 0.2,
      bridgeTimeMs: 90_000,
    },
    {
      chainId: 'ethereum',
      gasFeeUsd: 2.5,
      confirmationMs: 90_000,
      bridgeFeeUsd: 4.5,
      bridgeTimeMs: 300_000,
    },
  ];

  const chains = [
    {
      id: 'polygon',
      name: 'Polygon',
      nativeToken: 'MATIC',
      usdcAddress: '0x1',
      isActive: true,
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      nativeToken: 'ETH',
      usdcAddress: '0x2',
      isActive: true,
    },
  ];

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RoutingService,
        { provide: BalancesService, useValue: balancesService },
        { provide: GasOracleService, useValue: gasOracleService },
        { provide: ChainsService, useValue: chainsService },
      ],
    }).compile();

    service = moduleRef.get(RoutingService);

    gasOracleService.getGasInfo.mockResolvedValue(gasInfo);
    chainsService.findActive.mockResolvedValue(chains);
    jest.clearAllMocks();
  });

  it('selects a direct route when a chain has sufficient balance', async () => {
    balancesService.getUserBalances.mockResolvedValue([
      { chainId: 'polygon', balance: '100.000000' },
    ]);

    const result = await service.getBestRoute('user_1', toDecimal(50));

    expect(result.needsBridge).toBe(false);
    expect(result.sourceChain).toBe('polygon');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].type).toBe('transfer');
  });

  it('falls back to bridging when no single chain can cover the transfer', async () => {
    balancesService.getUserBalances.mockResolvedValue([
      { chainId: 'polygon', balance: '20.000000' },
      { chainId: 'ethereum', balance: '40.000000' },
    ]);

    const result = await service.getBestRoute('user_1', toDecimal(50));

    expect(result.needsBridge).toBe(true);
    expect(result.sourceChain).toBe('polygon');
    expect(result.destinationChain).toBe('ethereum');
    expect(result.steps[0].type).toBe('bridge');
    expect(result.steps[0].amount).toBe('10.000000');
  });
});
