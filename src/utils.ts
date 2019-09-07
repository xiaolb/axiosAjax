/**
 * @method 生成queryString
 * @param data
 * @return {String}
 * @desc {foo: 'bar', search: 123}  => foo=bar&search=123
 */
export const queryStringify = (data: any) => {
    const ret = [];
    for (let k in data) {
        const value = encodeURIComponent(data[k]);
        ret.push(`${k}=${value}`);
    }
    return ret.join('&');
};

// 深度继承
export const assignDeep = function(target: any, source: any) {
    let mergeData: any = {};
    if (typeof source !== 'object' || typeof target !== 'object') mergeData = Object.assign({}, target, source);
    else {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && typeof target[key] !== 'undefined' && target[key] !== null) {
                    mergeData[key] = assignDeep(target[key], source[key]);
                } else {
                    if (!target) target = {};
                    mergeData[key] = typeof source[key] === 'undefined' ? target[key] : source[key];
                }
            }
        }
    }
    return mergeData;
};

// 判断两个对象是否相等
export const deepEqual = function(x: any, y: any): boolean {
    // 指向同一内存时
    if (x === y) {
        return true;
    } else if (typeof x == 'object' && x != null && (typeof y == 'object' && y != null)) {
        if (Object.keys(x).length != Object.keys(y).length) return false;
        for (let prop in x) {
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
};
// 判断类型
export const isType = (type: string) => (obj: any) => ({}.toString.call(obj) === `[object ${type}]`);

// 判断是否undefined
export const isUndef = isType('Undefined');

// export function maybeAbort(p: Promise<any>) {
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
    const loop = () => {};
    let isAbort = false;
    let _export: {
        getAbortStatus(): boolean;
        abort(): void;
        maybeAbort(
            p: Promise<any>
        ): {
            promise: Promise<any>;
            abort(): void;
        };
    } 
    _export = {} as typeof _export;
    _export.getAbortStatus = function() {
        return isAbort;
    };
    _export.abort = function() {
        isAbort = true;
    };
    _export.maybeAbort = function(p) {
        const pending = new Promise(() => {});
        let promise = pending;
        let abort = loop;
        if (isAbort) {
            return {
                promise,
                abort,
            };
        }
        promise = Promise.race([
            p,
            new Promise((resolve, reject) => {
                abort = () => {
                    isAbort = true;
                    reject('abort');
                };
            }),
        ]).catch((e: any) => {
            if (e === 'abort') return pending;
            throw e;
        });
        return { promise, abort };
    };
    return _export;
}
