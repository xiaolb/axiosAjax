import { AxiosRequestConfig, Method } from 'axios';

export interface createAjaxOption {
    showLoading?: Function; // 显示loading方法
    hideLoading?: Function; // 隐藏loading方法
    loginCallback?: Function; // 未登录的回调
    errorMsgHandler: Function; // 异常消息处理方法
    requestConfig: any; // 请求的入参，可以配置公共的入参，如headers的ak或uk，数据结构同AxiosRequestConfig
    beforeRequestHandler?: Function; // 请求前的处理，如：获取签名等
}

export interface ajaxOption extends AxiosRequestConfig {
    cache?: boolean; // 是否启用接口缓存
    loading?: boolean; // 是否显示loading
    isHandleError?: boolean; // 业务处理异常
}
export interface emptyErrorProps {
    data: any;
}

export interface fileCfgProps {
    fileName: string;
}
export interface dbItem {
    requestmd5: string;
    response?: any;
}
