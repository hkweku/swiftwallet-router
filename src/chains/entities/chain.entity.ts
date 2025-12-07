type ChainType = {
  id: string;
  name: string;
  nativeToken: string;
  usdcAddress: string;
  isActive: boolean;
};

export class ChainEntity {
  id: string;
  name: string;
  nativeToken: string;
  usdcAddress: string;
  isActive: boolean;

  constructor(chain: ChainType) {
    this.id = chain.id;
    this.name = chain.name;
    this.nativeToken = chain.nativeToken;
    this.usdcAddress = chain.usdcAddress;
    this.isActive = chain.isActive;
  }
}
