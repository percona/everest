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
  const unitMatch = input.match(/^([0-9.]+)([A-Za-z]{1,2})$/);

  if (unitMatch) {
    const value = parseFloat(unitMatch[1]);
    // @ts-ignore
    const sourceUnit: kubernetesUnit = unitMatch[2];
    const valueBytes = value * memoryMultipliers[sourceUnit];

    return {
      value: targetUnit
        ? valueBytes / memoryMultipliers[targetUnit]
        : parseFloat(input),
      originalUnit: sourceUnit,
    };
  }

  return {
    value: parseFloat(input),
    originalUnit: '',
  };
};

export const getTotalResourcesDetailedString = (
  value: number,
  numberOfNodes: number,
  unit: string
) => {
  if (numberOfNodes === 1) {
    return `${value} ${unit}`;
  }

  const totalResources = value * numberOfNodes;

  return `${numberOfNodes} x ${value} ${unit} = ${totalResources} ${unit}`;
};
