import { isPlainObject, stringify } from '../src/utils';

function foo() {}

describe('isPlainObject', () => {
  it('should return true when obj is plain object', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ prop: true })).toBe(true);
    expect(
      isPlainObject({
        constructor: foo,
      }),
    ).toBe(true);
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  it('should return false when object is not plain object', () => {
    expect(isPlainObject()).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
    expect(isPlainObject('abc')).toBe(false);
    expect(isPlainObject(123)).toBe(false);
    expect(isPlainObject([1, 2, 3])).toBe(false);
    expect(isPlainObject(foo)).toBe(false);
    expect(isPlainObject(new Date())).toBe(false);
  });
});

describe('stringify', () => {
  it('should return the same string for string inputs', () => {
    expect(stringify('abc')).toEqual('abc');
  });

  it('should return "null" for null values', () => {
    expect(stringify(null)).toEqual('null');
  });

  it('should return "undefined" for undefined values', () => {
    expect(stringify(undefined)).toEqual('undefined');
  });

  it('should return "true" for boolean true', () => {
    expect(stringify(true)).toBe('true');
  });

  it('should return "false" boolean false', () => {
    expect(stringify(false)).toBe('false');
  });

  it('should stringify symbols correctly', () => {
    expect(stringify(Symbol('abc'))).toBe('Symbol(abc)');
  });

  it('should return the function name for functions', () => {
    expect(stringify(foo)).toBe('foo');
  });

  it('should return the class name for classes', () => {
    expect(stringify(Date)).toBe('Date');
  });

  it('should stringify numbers correctly', () => {
    expect(stringify(123)).toBe('123');
  });

  it('should stringify arrays correctly', () => {
    expect(stringify([123, 456])).toBe('[123, 456]');
  });
});
