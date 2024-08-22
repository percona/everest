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

export const memoryParser = (
  input: string,
  targetUnit?: kubernetesUnit
): {
  value: number;
  originalUnit: kubernetesUnit | '';
} => {
  const unitMatch = input.match(/^([0-9]+)([A-Za-z]{1,2})$/);

  if (unitMatch) {
    const value = parseInt(unitMatch[1], 10);
    // @ts-ignore
    const sourceUnit: kubernetesUnit = unitMatch[2];
    const valueBytes = value * memoryMultipliers[sourceUnit];

    return {
      value: targetUnit
        ? valueBytes / memoryMultipliers[targetUnit]
        : parseInt(input, 10),
      originalUnit: sourceUnit,
    };
  }

  // if (targetUnit && unitMatch) {
  //   const value = parseInt(unitMatch[1], 10);
  //   // @ts-ignore
  //   const sourceUnit: kubernetesUnit = unitMatch[2];

  //   const valueBytes = value * memoryMultipliers[sourceUnit];

  //   return {
  //     value: valueBytes / memoryMultipliers[targetUnit],
  //     originalUnit: sourceUnit,
  //   };
  // }

  return {
    value: parseInt(input, 10),
    originalUnit: '',
  };
};
