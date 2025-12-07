// eslint-disable-next-line @typescript-eslint/no-require-imports
const Decimal = require('@prisma/client/runtime/library').Decimal;

export type DecimalType = {
  toFixed: (digits: number) => string;
  toString: () => string;
  add: (value: DecimalType) => DecimalType;
  lt: (value: DecimalType) => boolean;
  lte: (value: DecimalType | number) => boolean;
  gt: (value: DecimalType | number) => boolean;
  gte: (value: DecimalType | number) => boolean;
  minus: (value: DecimalType) => DecimalType;
};

export const toDecimal = (
  value: DecimalType | number | string,
): DecimalType => {
  if (value instanceof Decimal) {
    return value as DecimalType;
  }

  return new Decimal(value) as DecimalType;
};

export const decimalToNumber = (value: DecimalType): number => Number(value);

export const decimalToString = (value: DecimalType): string => value.toFixed(6);
