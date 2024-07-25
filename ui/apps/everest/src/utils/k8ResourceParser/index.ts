const memoryMultipliers = {
  k: 10 ** -6,
  M: 10 ** -3,
  G: 1,
  T: 1000,
  P: 1000 ** 2,
  E: 1000 ** 3,
  Ki: 1024 * 10 ** -9,
  Mi: 1024 ** 2 * 10 ** -9,
  Gi: 1024 ** 3 * 10 ** -9,
  Ti: 1024 ** 4 * 10 ** -9,
  Pi: 1024 ** 5 * 10 ** -9,
  Ei: 1024 ** 6 * 10 ** -9,
};

export const cpuParser = (input: string) => {
  const milliMatch = input.match(/^([0-9]+)m$/);

  if (milliMatch) {
    // @ts-ignore
    return milliMatch[1] / 1000;
  }

  return parseFloat(input);
};

export const memoryParser = (input: string) => {
  const unitMatch = input.match(/^([0-9]+)([A-Za-z]{1,2})$/);

  if (unitMatch) {
    // @ts-ignore
    return parseInt(unitMatch[1], 10) * memoryMultipliers[unitMatch[2]];
  }

  return parseInt(input, 10);
};
