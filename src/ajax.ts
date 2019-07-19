import axios, { AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import qs from 'qs';
import { hexMd5 } from '@util/md5';
import { createAjaxOption, ajaxOption, emptyErrorProps } from './types';

const loop = function(params: any) {
    console.log(params);
};
// 深度继承
export const assignDeep = function(target: any, source: any) {
    if (typeof source !== 'object' || typeof target !== 'object') Object.assign(target, source);
    else {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && typeof target[key] !== 'undefined' && target[key] !== null) {
                    assignDeep(target[key], source[key]);
                } else {
                    if (!target) target = {};
                    target[key] = typeof source[key] === 'undefined' ? target[key] : source[key];
                }
            }
        }
    }
};
const isType = (type: string) => (obj: any) => ({}.toString.call(obj) === `[object ${type}]`);
// 获取存储接口缓存的key
const getStoreKey = (opt: ajaxOption) =>
    hexMd5(
        `${opt.method}@${opt.baseURL}${opt.url}@ak=${opt.headers.Authorization || ''}@params=${opt.params ? JSON.stringify(opt.params) : ''}@data=${
            opt.data ? JSON.stringify(opt.data) : ''
        }`
    );
// 判断接口返回数据是否相同
const diffServiceCache = (c1: any, c2: any) => {
    if (!c1 || !c2) return false;
    let c1str = isType('String')(c1) ? c1 : JSON.stringify(c1);
    let c2str = isType('String')(c2) ? c2 : JSON.stringify(c2);
    c1str = c1str.replace(/ServerTime[^}]+/, '');
    c2str = c2str.replace(/ServerTime[^}]+/, '');
    return c1str === c2str;
};
export const isUndef = isType('Undefined');

const createAjax = (option: createAjaxOption) => {
    const defaultOption = {
        showLoading: loop,
        hideLoading: loop,
        loginCallback: loop,
        errorMsgHandler: loop,
        requestConfig: {},
    };
    const mergeOption = {
        ...defaultOption,
        ...option,
    };
    const preCheckCode = (response: any, opt: ajaxOption) => {
        mergeOption.hideLoading(opt);
        // 通用请求判断
        if (!response) return;
        const data = response.data;
        if (isUndef(data.Code) || data.Code === 0) {
            if (opt.cache) {
                try {
                    localStorage.setItem(getStoreKey(opt), JSON.stringify(data));
                } catch (error) {}
            }
            // 缓存接口，第二次请求判断缓存和接口返回数据是否相同
            if (opt.cache === false) {
                try {
                    const cache = localStorage.getItem(getStoreKey(opt));
                    if (diffServiceCache(data, JSON.parse(cache))) {
                        return new Promise(() => {});
                    }
                    localStorage.setItem(getStoreKey(opt), JSON.stringify(data));
                } catch (error) {
                    console.log(error);
                }
            }
            return data.Data;
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
        };
        let objectSource: any = opt;
        for (const key in objectSource) {
            if (objectSource.hasOwnProperty(key)) {
                if (typeof objectSource[key] === 'undefined') delete objectSource[key];
            }
        }
        assignDeep(req, opt);
        if (mergeOption.beforeRequestHandler && mergeOption.beforeRequestHandler instanceof Function) {
            mergeOption
                .beforeRequestHandler(req)
                .then(
                    (res: any) => {
                        if (!isType('Undefined')(opt.cache)) {
                            let cacheData;
                            try {
                                cacheData = localStorage.getItem(getStoreKey(opt));
                            } catch (error) {}
                            if (cacheData && opt.cache === true) {
                                return Promise.resolve({ data: JSON.parse(cacheData) });
                            }
                            if (!cacheData && opt.cache === false) {
                                // 如果之前没有缓存过，第二次请求取消
                                return new Promise(() => {});
                            }
                        }
                        return axios(res);
                    },
                    (error: any) => error
                )
                .then((response: AxiosResponse) => preCheckCode(response, opt), (err: AxiosError) => preReject(err, opt));
        } else {
            return axios(req).then((response: AxiosResponse) => preCheckCode(response, opt), (err: AxiosError) => preReject(err, opt));
        }
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
    return { getJSON, postJSON, putJSON, deleteJSON };
};

export default { createAjax, axios };
