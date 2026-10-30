import type { Lifetime } from '@armscye/container';

export type ConflictPolicy = 'override' | 'error' | 'ignore';

export interface NeedleOptions {
  lifetime?: Lifetime;
  conflictPolicy?: ConflictPolicy;
}
