export function isPlainObject(value?: any): value is object {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);

  if (proto === null) {
    return true;
  }

  const ctor =
    Object.prototype.hasOwnProperty.call(proto, 'constructor') &&
    proto.constructor;

  return (
    typeof ctor === 'function' &&
    ctor instanceof ctor &&
    Function.prototype.toString.call(ctor) ===
      Function.prototype.toString.call(Object)
  );
}

export function stringify(value: any): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return '[' + value.map(stringify).join(', ') + ']';
  }

  if (typeof value === 'undefined' || value === null) {
    return '' + value;
  }

  if (value.name) {
    return `${value.name}`;
  }

  return value.toString();
}
