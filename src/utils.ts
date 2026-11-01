// Builds error messages, so it must not throw and hide the error being reported.
export function stringify(value: unknown): string {
  try {
    return format(value);
  } catch {
    return '[unserializable]';
  }
}

function format(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'function') {
    return value.name || '(anonymous)';
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => format(item)).join(', ')}]`;
  }
  if (typeof value === 'object' && value !== null) {
    return serialize(value);
  }
  return String(value);
}

function serialize(value: object): string {
  // The objects currently being serialized, from the root down to the holder.
  const ancestors: unknown[] = [];
  return JSON.stringify(value, function (this: unknown, _key, item: unknown) {
    if (
      typeof item === 'symbol' ||
      typeof item === 'function' ||
      typeof item === 'bigint'
    ) {
      return format(item);
    }
    if (typeof item === 'object' && item !== null) {
      while (ancestors.length > 0 && ancestors.at(-1) !== this) {
        ancestors.pop();
      }
      if (ancestors.includes(item)) {
        return '[Circular]';
      }
      ancestors.push(item);
    }
    return item;
  });
}
