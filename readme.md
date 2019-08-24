# GUIDE

ajax 的封装
请确保项目中能够使用 promise，includes，需要先引入 babel-polyfill

```js
if (!window.Promise) {
    window.Promise = Promise;
}
```

## Install

本项目依赖 axios，需要在工程中先安装 axios

```bash
yarn add axios # 安装依赖
npm i axios --save # 安装依赖

yarn add @util/ajax # 安装依赖
npm i @util/ajax --save # 安装依赖
```

## API

```js
import CreateAjax from '@util/ajax';
const demoAjax = new CreateAjax(config);
demoAjax.postJSON(opt);
demoAjax.getJSON(opt);
demoAjax.putJSON(opt);
demoAjax.deleteJSON(opt);
demoAjax.downloadFile(opt);
demoAjax.postFormData(opt);
```

## PARAMS

创建 ajax 时的入参

```ts
export interface createAjaxOption {
    showLoading?: Function; // 显示loading方法
    hideLoading?: Function; // 隐藏loading方法
    loginCallback?: Function; // 未登录的回调
    errorMsgHandler: Function; // 异常消息处理方法
    requestConfig: any; // 请求的入参，可以配置公共的入参，如headers的ak或uk，数据结构同AxiosRequestConfig
    beforeRequestHandler?: Function; // 请求前的处理，如：获取签名等
    projectName?: string; // 项目名称 主要用于接口缓存indexDB的storeName
}
```

业务层的入参

```ts
export interface ajaxOption extends AxiosRequestConfig {
    cache?: boolean; // 是否启用接口缓存
    loading?: boolean; // 是否显示loading
    isHandleError: boolean; // 业务处理异常
}

export interface AxiosRequestConfig {
    url?: string;
    method?: Method;
    baseURL?: string;
    transformRequest?: AxiosTransformer | AxiosTransformer[];
    transformResponse?: AxiosTransformer | AxiosTransformer[];
    headers?: any;
    params?: any;
    paramsSerializer?: (params: any) => string;
    data?: any;
    timeout?: number;
    withCredentials?: boolean;
    adapter?: AxiosAdapter;
    auth?: AxiosBasicCredentials;
    responseType?: ResponseType;
    xsrfCookieName?: string;
    xsrfHeaderName?: string;
    onUploadProgress?: (progressEvent: any) => void;
    onDownloadProgress?: (progressEvent: any) => void;
    maxContentLength?: number;
    validateStatus?: (status: number) => boolean;
    maxRedirects?: number;
    socketPath?: string | null;
    httpAgent?: any;
    httpsAgent?: any;
    proxy?: AxiosProxyConfig | false;
    cancelToken?: CancelToken;
}

// 默认的业务参数
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
```
