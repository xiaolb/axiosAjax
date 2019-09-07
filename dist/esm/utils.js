import "core-js/modules/es.array.iterator";
import "core-js/modules/es.object.keys";
import "core-js/modules/es.string.iterator";
import "core-js/modules/web.dom-collections.iterator";
import _typeof from "@babel/runtime/helpers/esm/typeof";

/**
 * @method 生成queryString
 * @param data
 * @return {String}
 * @desc {foo: 'bar', search: 123}  => foo=bar&search=123
 */
export var queryStringify = function queryStringify(data) {
  var ret = [];

  for (var k in data) {
    var value = encodeURIComponent(data[k]);
    ret.push("".concat(k, "=").concat(value));
  }

  return ret.join('&');
}; // 深度继承

export var assignDeep = function assignDeep(target, source) {
  var mergeData = {};
  if (target) mergeData = Object.assign({}, target);
  if (_typeof(source) !== 'object' || _typeof(target) !== 'object') mergeData = Object.assign({}, target, source);else {
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        if (_typeof(source[key]) === 'object' && typeof target[key] !== 'undefined' && target[key] !== null) {
          mergeData[key] = assignDeep(target[key], source[key]);
        } else {
          if (!target) target = {};
          mergeData[key] = typeof source[key] === 'undefined' ? target[key] : source[key];
        }
      }
    }
  }
  return mergeData;
}; // 判断两个对象是否相等

export var deepEqual = function deepEqual(x, y) {
  // 指向同一内存时
  if (x === y) {
    return true;
  } else if (_typeof(x) == 'object' && x != null && _typeof(y) == 'object' && y != null) {
    if (Object.keys(x).length != Object.keys(y).length) return false;

    for (var prop in x) {
      if (prop !== 'ServerTime') {
        if (y.hasOwnProperty(prop)) {
          if (!deepEqual(x[prop], y[prop])) {
            return false;
          }
        }
      }
    }

    return true;
  }

  return false;
}; // 判断类型

export var isType = function isType(type) {
  return function (obj) {
    return {}.toString.call(obj) === "[object ".concat(type, "]");
  };
}; // 判断是否undefined

export var isUndef = isType('Undefined'); // export function maybeAbort(p: Promise<any>) {
//     let abort;
//     const pending = Promise.race([
//         p,
//         new Promise((resolve, reject) => {
//             abort = () => reject('abort');
//         }),
//     ]).catch((e: any) => {
//         if (e === 'abort') return new Promise(() => { });
//         throw e;
//     });
//     return { pending, abort };
// }

export function createMaybeAbort() {
  var loop = function loop() {};

  var isAbort = false;

  var _export;

  _export = {};

  _export.getAbortStatus = function () {
    return isAbort;
  };

  _export.abort = function () {
    isAbort = true;
  };

  _export.maybeAbort = function (p) {
    var pending = new Promise(function () {});
    var promise = pending;
    var abort = loop;

    if (isAbort) {
      return {
        promise: promise,
        abort: abort
      };
    }

    promise = Promise.race([p, new Promise(function (resolve, reject) {
      abort = function abort() {
        isAbort = true;
        reject('abort');
      };
    })]).catch(function (e) {
      if (e === 'abort') return pending;
      throw e;
    });
    return {
      promise: promise,
      abort: abort
    };
  };

  return _export;
}