export const mapper = <From extends string | number | symbol, To = string>(
  values: { [key in From]?: To } & { _default: To }
) => {
  const { _default: defaultValue } = values;
  return (from?: From): To => {
    if (!from) {
      return defaultValue;
    }

    return values[from] ?? defaultValue;
  };
};
