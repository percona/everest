export const Messages = {
  sharding: {
    invalid: 'Please fill in valid values for sharding',
    min: (val: number) => `The value cannot be less than ${val}`,
    max: (val: number) => `The value cannot be more than ${val}`,
    odd: 'The value cannot be even',
  },
};
