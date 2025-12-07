import { toDecimal } from 'src/common/utils/decimal.utils';

type ChainType = {
  id: string;
  name: string;
  nativeToken: string;
  usdcAddress: string;
  isActive: boolean;
};
type DecimalType = ReturnType<typeof toDecimal>;
export type UserChainBalanceType = {
  id: string;
  userId: string;
  chainId: string;
  balance: DecimalType;
  chain?: ChainType | null;
};

export class UserChainBalanceEntity {
  id: string;
  userId: string;
  chainId: string;
  balance: string;
  chain?: ChainType;

  constructor(balance: UserChainBalanceType) {
    this.id = balance.id;
    this.userId = balance.userId;
    this.chainId = balance.chainId;
    this.balance = balance.balance.toFixed(6);
    if (balance.chain) {
      this.chain = balance.chain;
    }
  }
}
