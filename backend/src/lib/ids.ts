export const makeOrderId = () =>
  'BC' +
  Date.now().toString(36).slice(-5).toUpperCase() +
  Math.random().toString(36).slice(2, 5).toUpperCase()
