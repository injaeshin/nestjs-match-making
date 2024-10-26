import { createPool, Pool } from 'generic-pool';

function createObjectPool<T>(
  createFn: () => Promise<T>,
  destroyFn: (obj: T) => Promise<void>,
  max: number,
): Pool<T> {
  return createPool(
    {
      create: createFn,
      destroy: destroyFn,
    },
    {
      max,
    },
  );
}

export { createObjectPool };
