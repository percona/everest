type kubernetesUnit =
  | 'k'
  | 'M'
  | 'G'
  | 'T'
  | 'P'
  | 'E'
  | 'Ki'
  | 'Mi'
  | 'Gi'
  | 'Ti'
  | 'Pi'
  | 'Ei';

const memoryMultipliers: Record<kubernetesUnit, number> = {
  k: 10 ** 3,
  M: 10 ** 6,
  G: 10 ** 9,
  T: 10 ** 12,
  P: 10 ** 15,
  E: 10 ** 18,
  Ki: 1024,
  Mi: 1024 ** 2,
  Gi: 1024 ** 3,
  Ti: 1024 ** 4,
  Pi: 1024 ** 5,
  Ei: 1024 ** 6,
};

export const cpuParser = (input: string) => {
  const milliMatch = input.match(/^([0-9]+)m$/);

  if (milliMatch) {
    // @ts-ignore
    return milliMatch[1] / 1000;
  }

  return parseFloat(input);
};

export const memoryParser = (input: string, targetUnit?: kubernetesUnit) => {
  const unitMatch = input.match(/^([0-9]+)([A-Za-z]{1,2})$/);

  if (targetUnit && unitMatch) {
    const value = parseInt(unitMatch[1], 10);
    // @ts-ignore
    const sourceUnit: kubernetesUnit = unitMatch[2];

    const valueBytes = value * memoryMultipliers[sourceUnit];

    return valueBytes / memoryMultipliers[targetUnit];
  }

  return parseInt(input, 10);
};
