export function stringify(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'function') {
    return value.name || '(anonymous)';
  }
  if (Array.isArray(value)) {
    return `[${value.map(stringify).join(', ')}]`;
  }
  if (typeof value === 'object' && value !== null) {
    return serialize(value);
  }
  return String(value);
}

function serialize(value: object): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (key, item: unknown) => {
    if (
      typeof item === 'symbol' ||
      typeof item === 'function' ||
      typeof item === 'bigint'
    ) {
      return stringify(item);
    }
    if (typeof item === 'object' && item !== null) {
      if (seen.has(item)) {
        return '[Circular]';
      }
      seen.add(item);
    }
    return item;
  });
}
