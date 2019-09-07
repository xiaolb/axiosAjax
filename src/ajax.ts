import axios, { AxiosResponse, AxiosError, AxiosRequestConfig, Canceler } from 'axios';
import qs from 'qs';
import { hexMd5 } from '@util/md5';
import createIndexDB, { TopsIndexDB } from '@util/indexdb';
import { createAjaxOption, ajaxOption, emptyErrorProps, fileCfgProps, INDICATOR, AxiosRequestConfigMergeWithAjaxOption } from './types';
import { queryStringify, assignDeep, deepEqual, isType, createMaybeAbort } from './utils';

const loop = function(params: any) {
    console.log(params);
};

const PENDING = new Promise(() => {});

let cacheDB: TopsIndexDB = null;

const requestMap = {
    requests: {},
    save(key: string, cancel: Canceler) {
        if (this.requests[key]) {
            this.requests[key]();
        }
        this.requests[key] = cancel;
    },
    getKey(req: AxiosRequestConfig) {
        return hexMd5(`${req.method}@${req.baseURL}${req.url}@ak=${req.headers ? req.headers.Authorization || '' : ''}`);
    },
};
// const responseMap4cache: { [key: string]: any } = {};

// 获取存储接口缓存的key
const getStoreKey = (opt: ajaxOption) =>
    hexMd5(
        `${opt.method}@${opt.baseURL}${opt.url}@ak=${opt.headers ? opt.headers.Authorization || '' : ''}@params=${
            opt.params ? JSON.stringify(opt.params) : ''
        }@data=${opt.data ? JSON.stringify(opt.data) : ''}`
    );

const createAjax = (option: createAjaxOption) => {
    const defaultOption = {
        showLoading: loop,
        hideLoading: loop,
        loginCallback: loop,
        errorMsgHandler: loop,
        requestConfig: {},
        projectName: '',
        beforeRequestHandler: function(req: AxiosRequestConfig) {
            return new Promise(function(resolve) {
                resolve(req);
            });
        },
    };
    const mergeOption = {
        ...defaultOption,
        ...option,
    };
    cacheDB = new createIndexDB('tops-ajax', 'pkg', 'requestmd5');
    const preCheckCode = function(response: any, opt: AxiosRequestConfigMergeWithAjaxOption, indicator: INDICATOR) {
        // 如果indicator存在则说明走的流程是：一次取indexdb，一次取接口
        // cache和interface为falsely的值时，说明是该组请求第一次执行回调
        if (indicator && !indicator.cache && !indicator.interface) {
            mergeOption.hideLoading(opt);
        } else {
            // 正常流程
            mergeOption.hideLoading(opt);
        }
        if (response.request && response.request.responseType === 'blob') {
            if (response.headers['content-disposition']) {
                return Promise.resolve(response);
            }
            // 下载出现异常处理
            const reader = new FileReader();
            reader.readAsText(response.data, 'utf8');
            reader.onload = function() {
                if (this.result && typeof this.result === 'string' && !opt.isHandleError) {
                    if (this.result) return mergeOption.errorMsgHandler(JSON.parse(this.result).Message);
                } else {
                    return Promise.reject(response.data || {});
                }
            };
            return false;
        }
        // 通用请求判断
        if (!response) return;
        const data = response.data;
        if (!data) {
            if (opt.isHandleError) {
                return Promise.reject(response || {});
            }
            mergeOption.errorMsgHandler(`网络错误，请稍后再试！[${response.status}]`);
            return Promise.resolve(null);
        }        
        if (data.Code === 0) {
            if (data.Data && isType('Object')(data.Data)) data.Data.cache = opt.cache;
            return Promise.resolve(data.Data);
        }
        if (opt.isHandleError) {
            return Promise.reject(response.data || {});
        }

        if (data.Code === 302) {
            window.location.href = data.message + window.location.hash;
            return Promise.resolve(null);
        }
        if (data.Code === 4002 || data.Code === 4000) {
            if (mergeOption.loginCallback && mergeOption.loginCallback instanceof Function) mergeOption.loginCallback(data);
            return Promise.resolve(null);
        }
        if (response.data && response.data.Message) {
            mergeOption.hideLoading(opt);
            if (opt.isHandleError) {
                return Promise.reject(response.data);
            }
            mergeOption.errorMsgHandler(response.data.Message);
            return Promise.resolve(null);
        }
        return Promise.reject(opt.isHandleError ? response.data : {});
    };
    const preReject = (err: AxiosError, opt: AxiosRequestConfigMergeWithAjaxOption) => {
        mergeOption.hideLoading(opt);
        // 请求丢失时触发
        const emptyError: emptyErrorProps = {
            data: null,
        };
        const response = err.response || emptyError;
        if (err.message === 'Network Error') {
            err.message = '网络错误，请稍后再试！';
            if (!response.data) response.data = {};
            response.data.Message = '网络错误，请稍后再试！';
        }
        if (opt.isHandleError) {
            mergeOption.hideLoading(opt);
            return Promise.reject(response.data || {});
        }
        if (response.data && response.data.Message) {
            setTimeout(() => {
                mergeOption.hideLoading(opt);
                mergeOption.errorMsgHandler(response.data.Message);
            }, 0);
            return Promise.resolve(null);
        }
        if (err.message) {
            setTimeout(() => {
                mergeOption.hideLoading(opt);
                mergeOption.errorMsgHandler(err.message);
            }, 0);
            return Promise.resolve(null);
        }
        // customError表示是否自定义错误处理
        return Promise.reject(opt.isHandleError ? response.data || {} : {});
    };

    // cache参数为true时，第一次调用common之后，common会指向cache_flow_common
    // cache_flow_common用于处理真实的ajax请求
    const cache_flow_common = (indicator: INDICATOR, beforeHandle: Promise<AxiosRequestConfigMergeWithAjaxOption>) => async () => {
        common = normal_flow_common; // common重新指向正常流程的请求函数

        const req = await beforeHandle;
        return axios(req).then(
            async (response: AxiosResponse) => {
                indicator.interface = true;
                console.log('use ajax');
                // 在preCheckCode中判断执行阶段较繁琐
                // 将缓存的比较和读写从preCheckCode抽离
                if (response.data.Code === 0) {
                    let key = getStoreKey(req);
                    const cacheData = indicator.cache || (await cacheDB.getData4DB(key));
                    // 内容一致时
                    if (cacheData && deepEqual(response.data, cacheData)) {
                        // 内容已经被第一阶段（取indexdb）回调过或者将要被回调
                        if (indicator.cache) {
                            return PENDING;
                        }
                    } else {
                        // 内容不一致，重写缓存
                        response.data.Data && cacheDB.addData4DB(key, response.data);
                    }
                }
                return preCheckCode(response, req, indicator);
            },
            (err: AxiosError) => preReject(err, req)
        );
    };

    // 在cache为true时请求indexdb，否则直接请求接口
    const normal_flow_common = async (opt: ajaxOption = { url: '', method: 'GET', loading: false, isHandleError: false }) => {
        if (!window || !window.indexedDB) opt.cache = void 0;
        const defaultAjaxOption = {
            url: '',
            method: 'GET',
            loading: false,
            isHandleError: false,
            similarityCancel: true,
        };
        opt = Object.assign(defaultAjaxOption, opt);
        let indicator: INDICATOR;
        let cancel: Canceler;
        let cancelCache: any;
        const cancelToken = new axios.CancelToken(function(c: Canceler) {
            cancel = c;
        });

        let req: AxiosRequestConfigMergeWithAjaxOption = {
            ...mergeOption.requestConfig,
            method: 'GET',
            url: '',
            data: null,
            params: null,
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
            },
            responseType: 'json',
            withCredentials: true,
            cancelToken,
        };

        for (const key in opt) {
            if (opt.hasOwnProperty(key)) {
                if (isType('Undefined')(opt[key])) delete opt[key];
            }
        }

        req = assignDeep(req, opt);

        if (opt.loading) {
            mergeOption.showLoading(req);
        }

        if (req.similarityCancel) {
            requestMap.save(requestMap.getKey(req), () => {
                cancel();
                cancelCache && cancelCache();
            });
        }

        const beforeHandle: Promise<AxiosRequestConfigMergeWithAjaxOption> = mergeOption.beforeRequestHandler(req);

        let fn;
        if (opt.cache === true) {
            indicator = {
                cache: false,
                interface: false,
            };
            common = cache_flow_common(indicator, beforeHandle); // normal_flow_common在走cache流程时必须能同步执行到这一步（关键）
            const { maybeAbort, abort } = createMaybeAbort();
            cancelCache = abort;
            fn = function() {
                const { promise, abort: _abort } = maybeAbort(
                    (async () => {
                        let cacheData;
                        let key: string = getStoreKey(opt);
                        try {
                            // // 延迟读取，模拟读取较慢的时候
                            // await new Promise(resolve => {
                            //     setTimeout(resolve, 5000);
                            // });
                            cacheData = await cacheDB.getData4DB(key);
                        } catch (error) {
                            console.log(error);
                        }
                        if (!cacheData || indicator.interface) {
                            return PENDING; // 没有缓存或者接口更快
                        }
                        console.log('use cache');
                        indicator.cache = cacheData;
                        return { data: cacheData };
                    })()
                );
                cancelCache = _abort;
                return promise.then(async (response: any) => {
                    // 保持preCheckCode和preReject中的req参数与正常请求的参数一致
                    req = await beforeHandle;
                    return response;
                });
            };
        } else {
            req = await beforeHandle;
            fn = axios;
        }

        try {
            const response = await fn(req);
            return preCheckCode(response, req, indicator);
        } catch (err) {
            return preReject(err, req);
        }
    };

    let common: any;
    common = normal_flow_common;

    /* ------------------------------------------------------------------------------------------------------------------------------ */

    const getJSON = (opt: ajaxOption) => {
        opt.method = 'GET';
        if (opt.params && Object.keys(opt.params).length) {
            opt.paramsSerializer = (params: any) => qs.stringify(params, { indices: false });
        }
        return common(opt);
    };

    const postJSON = (opt: ajaxOption) => {
        opt.method = 'POST';
        if (opt.params && Object.keys(opt.params).length) {
            opt.paramsSerializer = (params: any) => qs.stringify(params, { indices: false });
        }
        return common(opt);
    };
    const putJSON = (opt: ajaxOption) => {
        opt.method = 'PUT';
        return common(opt);
    };

    const deleteJSON = (opt: ajaxOption) => {
        opt.method = 'DELETE';
        return common(opt);
    };
    // 登录时需使用formdata格式传输数据
    const postFormData = (opt: ajaxOption) => {
        opt.method = 'POST';
        opt.data = queryStringify(opt.data);
        opt.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        return common(opt);
    };
    // 下载接口
    const downloadFile = (opt: ajaxOption, fileCfg: fileCfgProps) => {
        if (!window) return new Error('此方法依赖浏览器方法 window.URL.createObjectURL');
        // 下载文件是data字段，不是params字段
        opt.method = 'POST';
        opt.responseType = 'blob';
        opt.headers = {
            'Content-Type': 'blob',
        };
        return common(opt).then((res: AxiosResponse) => {
            if (!res) return;
            let resFileName = '';
            try {
                resFileName = decodeURIComponent(res.headers['content-disposition'].split('=')[1]); // 后端返回的名称
            } catch (error) {
                console.log(error);
            }
            const datas = res instanceof Blob ? res : new Blob([res.data], { type: 'application/octet-stream' });
            const textFile = window.URL.createObjectURL(datas);
            if (textFile !== null) {
                const a = document.createElement('a');
                a.style.display = 'none';
                document.body.appendChild(a);
                a.href = textFile;
                a.download = fileCfg && fileCfg.fileName ? fileCfg.fileName : resFileName; // 优先取自义定名称
                a.click();
                window.URL.revokeObjectURL(textFile);
            }
        });
    };
    return { getJSON, postJSON, putJSON, deleteJSON, downloadFile, postFormData };
};

export default createAjax;
