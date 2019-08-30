import axios, { AxiosResponse, AxiosError, AxiosRequestConfig, CancelToken } from 'axios';
import qs from 'qs';
import { hexMd5 } from '@util/md5';
import createIndexDB, { TopsIndexDB } from '@util/indexdb';
import { createAjaxOption, ajaxOption, emptyErrorProps, fileCfgProps } from './types';
import { queryStringify, assignDeep, deepEqual, isType } from './utils';

const loop = function(params: any) {
    console.log(params);
};
let cacheDB: TopsIndexDB = null;

const requestMap = {
    requests: {},
    save(key: string, cancel: CancelToken) {
        if (this.requests[key]) {
            this.requests[key]();
        }
        this.requests[key] = cancel;
    },
    getKey(req: AxiosRequestConfig) {
        return hexMd5(`${req.method}@${req.baseURL}${req.url}@ak=${req.headers ? req.headers.Authorization || '' : ''}`);
    },
};
const responseMap4cache: { [key: string]: any } = {};
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
    const preCheckCode = async function(response: any, opt: ajaxOption) {
        mergeOption.hideLoading(opt);
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
        let key = getStoreKey(opt);
        if (data.Code === 0) {
            // 缓存接口，第二次请求判断缓存和接口返回数据是否相同
            if (opt.cache === false) {
                if (responseMap4cache[key]) {
                    try {
                        const cacheData = responseMap4cache[key].cacheData || (await cacheDB.getData4DB(key));

                        if (cacheData && deepEqual(data, cacheData)) {
                            return new Promise(() => {});
                        }
                    } catch (error) {
                        console.log(error);
                    }
                    Reflect.deleteProperty(responseMap4cache, key);
                } else {
                    responseMap4cache[key] = {
                        loaded: true,
                    };
                }

                data.Data && cacheDB.addData4DB(key, data);
            }
            data.Data.cache = opt.cache;
            return Promise.resolve(data.Data);
        }
        if (opt.isHandleError) {
            return Promise.reject(response.data || {});
        }
        if (response.data && response.data.Message) {
            mergeOption.hideLoading(opt);
            return Promise.resolve(null);
        }
        if (data.Code === 302) {
            window.location.href = data.message + window.location.hash;
            return Promise.resolve(null);
        }
        if (data.Code === 4002 || data.Code === 4000) {
            if (mergeOption.loginCallback && mergeOption.loginCallback instanceof Function) mergeOption.loginCallback(data);
            return Promise.resolve(null);
        }
        return Promise.reject(opt.isHandleError ? response.data : {});
    };
    const preReject = (err: AxiosError, opt: ajaxOption) => {
        mergeOption.hideLoading(opt);
        let key = getStoreKey(opt);
        Reflect.deleteProperty(responseMap4cache, key);
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
    const common = (opt: ajaxOption = { url: '', method: 'GET', loading: false, isHandleError: false }) => {
        let cancel;
        let cancelToken = new axios.CancelToken(function(c: Function) {
            cancel = c;
        });
        if (!window || !window.indexedDB) opt.cache = void 0;
        if (opt.loading) {
            mergeOption.showLoading(opt);
        }
        const req: AxiosRequestConfig = {
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
        let objectSource: any = opt;
        for (const key in objectSource) {
            if (objectSource.hasOwnProperty(key)) {
                if (isType('Undefined')(objectSource[key])) delete objectSource[key];
            }
        }
        const mergeReq = assignDeep(req, opt);

        requestMap.save(requestMap.getKey(mergeReq), cancel);
        return mergeOption
            .beforeRequestHandler(mergeReq)
            .then(
                async function(res: AxiosRequestConfig) {
                    let cacheData;
                    if (opt.cache === true) {
                        let key: string = getStoreKey(opt);
                        try {
                            cacheData = await cacheDB.getData4DB(key);
                        } catch (error) {
                            console.log(error);
                        }
                        if (!cacheData || responseMap4cache[key]) {
                            Reflect.deleteProperty(responseMap4cache, key);
                            return new Promise(() => {}); // 没有缓存或者接口更快
                        }
                        responseMap4cache[key] = {
                            loaded: true,
                            cacheData,
                        };
                        setTimeout(() => {
                            // 清除获取缓存记录，以防下次调用时判断错误
                            Reflect.deleteProperty(responseMap4cache, key);
                        }, 5000);
                        return Promise.resolve({ data: cacheData });
                    }
                    return axios(res);
                },
                (error: any) => error
            )
            .then((response: AxiosResponse) => preCheckCode(response, mergeReq), (err: AxiosError) => preReject(err, mergeReq));
    };
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
