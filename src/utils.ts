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

export function stringify(val: any): string {
  if (typeof val === 'string') {
    return val;
  }

  if (Array.isArray(val)) {
    return '[' + val.map(stringify).join(', ') + ']';
  }

  if (typeof val === 'undefined' || val === null) {
    return '' + val;
  }

  if (val.name) {
    return `${val.name}`;
  }

  return val.toString();
}
