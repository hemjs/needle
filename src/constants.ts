import type { Lifetime } from '@armscye/container';

import type { ConflictPolicy } from './types.js';

export const LIFETIMES: readonly Lifetime[] = ['singleton', 'transient'];

export const CONFLICT_POLICIES: readonly ConflictPolicy[] = [
  'override',
  'error',
  'ignore',
];
