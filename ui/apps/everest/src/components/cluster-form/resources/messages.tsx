export const Messages = {
  sharding: {
    invalid: 'Please fill in valid values for sharding',
    min: (val: number) => `The value cannot be less than ${val}`,
    minForNodes: 'The minimum number of shards should be 2',
    max: (val: number) => `The value cannot be more than ${val}`,
    odd: 'The value cannot be even',
    numberOfShards: 'Nº of shards',
    numberOfConfigurationServers: 'Nº of configuration servers',
    numberOfConfigServersError:
      'The number of configuration servers cannot be 1 if the number of database nodes is greater than 1',
  },
  customValue: 'Custom',
  resourcesCapacityExceeding: (
    fieldName: string,
    value: number | undefined,
    units: string
  ) =>
    `Your specified ${fieldName} size exceeds the ${
      value ? `${value.toFixed(2)} ${units}` : ''
    } available. Enter a smaller value before continuing.`,
};
