import "core-js/modules/es.symbol";
import "core-js/modules/es.array.iterator";
import "core-js/modules/es.map";
import "core-js/modules/es.object.get-own-property-descriptor";
import "core-js/modules/es.object.get-own-property-descriptors";
import "core-js/modules/es.object.keys";
import "core-js/modules/es.string.iterator";
import "core-js/modules/es.string.split";
import "core-js/modules/web.dom-collections.iterator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import "regenerator-runtime/runtime";
import _asyncToGenerator from "@babel/runtime/helpers/esm/asyncToGenerator";
import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

import axios from 'axios';
import qs from 'qs';
import { hexMd5 } from '@util/md5';
import createIndexDB from '@util/indexdb';
import { queryStringify, assignDeep, deepEqual, isType, createMaybeAbort } from './utils';

var loop = function loop(params) {
  console.log(params);
};

var PENDING = new Promise(function () {});
var cacheDB = null;
var loadingMap = new Map();
var requestMap = {
  requests: {},
  save: function save(key, cancel) {
    if (this.requests[key]) {
      this.requests[key]('too many similarity request');
    }

    this.requests[key] = cancel;
  },
  getKey: function getKey(req) {
    return hexMd5("".concat(req.method, "@").concat(req.baseURL).concat(req.url, "@ak=").concat(req.headers ? req.headers.Authorization || '' : ''));
  }
}; // const responseMap4cache: { [key: string]: any } = {};
// 获取存储接口缓存的key

var getStoreKey = function getStoreKey(opt) {
  return hexMd5("".concat(opt.method, "@").concat(opt.baseURL).concat(opt.url, "@ak=").concat(opt.headers ? opt.headers.Authorization || '' : '', "@params=").concat(opt.params ? JSON.stringify(opt.params) : '', "@data=").concat(opt.data ? JSON.stringify(opt.data) : ''));
};

var createAjax = function createAjax(option) {
  var defaultOption = {
    showLoading: loop,
    hideLoading: loop,
    loginCallback: loop,
    errorMsgHandler: loop,
    requestConfig: {},
    projectName: '',
    beforeRequestHandler: function beforeRequestHandler(req) {
      return new Promise(function (resolve) {
        resolve(req);
      });
    }
  };

  var mergeOption = _objectSpread({}, defaultOption, {}, option);

  var isLoading = false;

  var showLoading = function showLoading(req) {
    loadingMap.set(req, true);

    if (!isLoading) {
      isLoading = true;
      mergeOption.showLoading(req);
    }
  };

  var hideLoading = function hideLoading(req) {
    loadingMap.delete(req);

    if (!loadingMap.size) {
      isLoading = false;
      mergeOption.hideLoading(req);
    }
  };

  cacheDB = new createIndexDB('tops-ajax', 'pkg', 'requestmd5');

  var preCheckCode = function preCheckCode(response, opt, indicator) {
    // 如果indicator存在则说明走的流程是：一次取indexdb，一次取接口
    // cache和interface为falsely的值时，说明是该组请求第一次执行回调
    if (indicator && !indicator.cache && !indicator.interface) {
      hideLoading(opt);
    } else {
      // 正常流程
      hideLoading(opt);
    }

    if (response.request && response.request.responseType === 'blob') {
      if (response.headers['content-disposition']) {
        return Promise.resolve(response);
      } // 下载出现异常处理


      var reader = new FileReader();
      reader.readAsText(response.data, 'utf8');

      reader.onload = function () {
        if (this.result && typeof this.result === 'string' && !opt.isHandleError) {
          if (this.result) return mergeOption.errorMsgHandler(JSON.parse(this.result).Message);
        } else {
          return Promise.reject(response.data || {});
        }
      };

      return false;
    } // 通用请求判断


    if (!response) return;
    var data = response.data;

    if (!data) {
      if (opt.isHandleError) {
        return Promise.reject(response || {});
      }

      mergeOption.errorMsgHandler("\u7F51\u7EDC\u9519\u8BEF\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5\uFF01[".concat(response.status, "]"));
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
      if (opt.isHandleError) {
        return Promise.reject(response.data);
      }

      mergeOption.errorMsgHandler(response.data.Message);
      return Promise.resolve(null);
    }

    return Promise.reject(opt.isHandleError ? response.data : {});
  };

  var preReject = function preReject(err, opt) {
    hideLoading(opt); // 请求丢失时触发

    var emptyError = {
      data: null
    };
    if (err instanceof axios.Cancel) return Promise.resolve(null);
    var response = err.response || emptyError;

    if (err.message === 'Network Error') {
      err.message = '网络错误，请稍后再试！';
      if (!response.data) response.data = {};
      response.data.Message = '网络错误，请稍后再试！';
    }

    if (opt.isHandleError) {
      return Promise.reject(response.data || {});
    }

    if (response.data && response.data.Message) {
      setTimeout(function () {
        hideLoading(opt);
        mergeOption.errorMsgHandler(response.data.Message);
      }, 0);
      return Promise.resolve(null);
    }

    if (err.message) {
      setTimeout(function () {
        hideLoading(opt);
        mergeOption.errorMsgHandler(err.message);
      }, 0);
      return Promise.resolve(null);
    } // customError表示是否自定义错误处理


    return Promise.reject(opt.isHandleError ? response.data || {} : {});
  }; // cache参数为true时，第一次调用common之后，common会指向cache_flow_common
  // cache_flow_common用于处理真实的ajax请求


  var cache_flow_common = function cache_flow_common(indicator, beforeHandle) {
    return (
      /*#__PURE__*/
      _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee2() {
        var req;
        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                common = normal_flow_common; // common重新指向正常流程的请求函数

                _context2.next = 3;
                return beforeHandle;

              case 3:
                req = _context2.sent;
                return _context2.abrupt("return", axios(req).then(
                /*#__PURE__*/
                function () {
                  var _ref2 = _asyncToGenerator(
                  /*#__PURE__*/
                  _regeneratorRuntime.mark(function _callee(response) {
                    var key, cacheData;
                    return _regeneratorRuntime.wrap(function _callee$(_context) {
                      while (1) {
                        switch (_context.prev = _context.next) {
                          case 0:
                            indicator.interface = true;
                            console.log('use ajax'); // 在preCheckCode中判断执行阶段较繁琐
                            // 将缓存的比较和读写从preCheckCode抽离

                            if (!(response.data.Code === 0)) {
                              _context.next = 16;
                              break;
                            }

                            key = getStoreKey(req);
                            _context.t0 = indicator.cache;

                            if (_context.t0) {
                              _context.next = 9;
                              break;
                            }

                            _context.next = 8;
                            return cacheDB.getData4DB(key);

                          case 8:
                            _context.t0 = _context.sent;

                          case 9:
                            cacheData = _context.t0;

                            if (!(cacheData && deepEqual(response.data, cacheData))) {
                              _context.next = 15;
                              break;
                            }

                            if (!indicator.cache) {
                              _context.next = 13;
                              break;
                            }

                            return _context.abrupt("return", PENDING);

                          case 13:
                            _context.next = 16;
                            break;

                          case 15:
                            // 内容不一致，重写缓存
                            response.data.Data && cacheDB.addData4DB(key, response.data);

                          case 16:
                            return _context.abrupt("return", preCheckCode(response, req, indicator));

                          case 17:
                          case "end":
                            return _context.stop();
                        }
                      }
                    }, _callee);
                  }));

                  return function (_x) {
                    return _ref2.apply(this, arguments);
                  };
                }(), function (err) {
                  return preReject(err, req);
                }));

              case 5:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }))
    );
  }; // 在cache为true时请求indexdb，否则直接请求接口


  var normal_flow_common =
  /*#__PURE__*/
  function () {
    var _ref3 = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee5() {
      var opt,
          defaultAjaxOption,
          indicator,
          cancel,
          cancelCache,
          cancelToken,
          req,
          key,
          beforeHandle,
          fn,
          _createMaybeAbort,
          maybeAbort,
          abort,
          response,
          _args5 = arguments;

      return _regeneratorRuntime.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              opt = _args5.length > 0 && _args5[0] !== undefined ? _args5[0] : {
                url: '',
                method: 'GET',
                loading: false,
                isHandleError: false
              };
              if (!window || !window.indexedDB) opt.cache = void 0;
              defaultAjaxOption = {
                url: '',
                method: 'GET',
                loading: false,
                isHandleError: false,
                concurrent: true
              };
              opt = Object.assign(defaultAjaxOption, opt);
              cancelToken = new axios.CancelToken(function (c) {
                cancel = c;
              });
              req = _objectSpread({}, mergeOption.requestConfig, {
                method: 'GET',
                url: '',
                data: null,
                params: null,
                headers: {
                  'Content-Type': 'application/json; charset=UTF-8'
                },
                responseType: 'json',
                withCredentials: true,
                cancelToken: cancelToken
              });

              for (key in opt) {
                if (opt.hasOwnProperty(key)) {
                  if (isType('Undefined')(opt[key])) delete opt[key];
                }
              }

              req = assignDeep(req, opt);

              if (opt.loading) {
                showLoading(req);
              }

              if (req.concurrent === false) {
                requestMap.save(requestMap.getKey(req), function () {
                  cancel();
                  cancelCache && cancelCache();
                });
              }

              beforeHandle = mergeOption.beforeRequestHandler(req);

              if (!(opt.cache === true)) {
                _context5.next = 19;
                break;
              }

              indicator = {
                cache: false,
                interface: false
              };
              common = cache_flow_common(indicator, beforeHandle); // normal_flow_common在走cache流程时必须能同步执行到这一步（关键）

              _createMaybeAbort = createMaybeAbort(), maybeAbort = _createMaybeAbort.maybeAbort, abort = _createMaybeAbort.abort;
              cancelCache = abort;

              fn = function fn() {
                var _maybeAbort = maybeAbort(_asyncToGenerator(
                /*#__PURE__*/
                _regeneratorRuntime.mark(function _callee3() {
                  var cacheData, key;
                  return _regeneratorRuntime.wrap(function _callee3$(_context3) {
                    while (1) {
                      switch (_context3.prev = _context3.next) {
                        case 0:
                          key = getStoreKey(opt);
                          _context3.prev = 1;
                          _context3.next = 4;
                          return cacheDB.getData4DB(key);

                        case 4:
                          cacheData = _context3.sent;
                          _context3.next = 10;
                          break;

                        case 7:
                          _context3.prev = 7;
                          _context3.t0 = _context3["catch"](1);
                          console.log(_context3.t0);

                        case 10:
                          if (!(!cacheData || indicator.interface)) {
                            _context3.next = 12;
                            break;
                          }

                          return _context3.abrupt("return", PENDING);

                        case 12:
                          console.log('use cache');
                          indicator.cache = cacheData;
                          return _context3.abrupt("return", {
                            data: cacheData
                          });

                        case 15:
                        case "end":
                          return _context3.stop();
                      }
                    }
                  }, _callee3, null, [[1, 7]]);
                }))()),
                    promise = _maybeAbort.promise,
                    _abort = _maybeAbort.abort;

                cancelCache = _abort;
                return promise.then(
                /*#__PURE__*/
                function () {
                  var _ref5 = _asyncToGenerator(
                  /*#__PURE__*/
                  _regeneratorRuntime.mark(function _callee4(response) {
                    return _regeneratorRuntime.wrap(function _callee4$(_context4) {
                      while (1) {
                        switch (_context4.prev = _context4.next) {
                          case 0:
                            _context4.next = 2;
                            return beforeHandle;

                          case 2:
                            req = _context4.sent;
                            return _context4.abrupt("return", response);

                          case 4:
                          case "end":
                            return _context4.stop();
                        }
                      }
                    }, _callee4);
                  }));

                  return function (_x2) {
                    return _ref5.apply(this, arguments);
                  };
                }());
              };

              _context5.next = 23;
              break;

            case 19:
              _context5.next = 21;
              return beforeHandle;

            case 21:
              req = _context5.sent;
              fn = axios;

            case 23:
              _context5.prev = 23;
              _context5.next = 26;
              return fn(req);

            case 26:
              response = _context5.sent;
              return _context5.abrupt("return", preCheckCode(response, req, indicator));

            case 30:
              _context5.prev = 30;
              _context5.t0 = _context5["catch"](23);
              return _context5.abrupt("return", preReject(_context5.t0, req));

            case 33:
            case "end":
              return _context5.stop();
          }
        }
      }, _callee5, null, [[23, 30]]);
    }));

    return function normal_flow_common() {
      return _ref3.apply(this, arguments);
    };
  }();

  var common;
  common = normal_flow_common;
  /* ------------------------------------------------------------------------------------------------------------------------------ */

  var getJSON = function getJSON(opt) {
    opt.method = 'GET';

    if (opt.params && Object.keys(opt.params).length) {
      opt.paramsSerializer = function (params) {
        return qs.stringify(params, {
          indices: false
        });
      };
    }

    return common(opt);
  };

  var postJSON = function postJSON(opt) {
    opt.method = 'POST';

    if (opt.params && Object.keys(opt.params).length) {
      opt.paramsSerializer = function (params) {
        return qs.stringify(params, {
          indices: false
        });
      };
    }

    return common(opt);
  };

  var putJSON = function putJSON(opt) {
    opt.method = 'PUT';

    if (opt.params && Object.keys(opt.params).length) {
      opt.paramsSerializer = function (params) {
        return qs.stringify(params, {
          indices: false
        });
      };
    }

    return common(opt);
  };

  var deleteJSON = function deleteJSON(opt) {
    opt.method = 'DELETE';

    if (opt.params && Object.keys(opt.params).length) {
      opt.paramsSerializer = function (params) {
        return qs.stringify(params, {
          indices: false
        });
      };
    }

    return common(opt);
  }; // 登录时需使用formdata格式传输数据


  var postFormData = function postFormData(opt) {
    opt.method = 'POST';
    opt.data = queryStringify(opt.data);
    opt.headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    return common(opt);
  }; // 下载接口


  var downloadFile = function downloadFile(opt, fileCfg) {
    if (!window) return new Error('此方法依赖浏览器方法 window.URL.createObjectURL'); // 下载文件是data字段，不是params字段

    opt.method = 'POST';
    opt.responseType = 'blob';
    opt.headers = {
      'Content-Type': 'blob'
    };
    return common(opt).then(function (res) {
      if (!res) return;
      var resFileName = '';

      try {
        resFileName = decodeURIComponent(res.headers['content-disposition'].split('=')[1]); // 后端返回的名称
      } catch (error) {
        console.log(error);
      }

      var datas = res instanceof Blob ? res : new Blob([res.data], {
        type: 'application/octet-stream'
      });
      var textFile = window.URL.createObjectURL(datas);

      if (textFile !== null) {
        var a = document.createElement('a');
        a.style.display = 'none';
        document.body.appendChild(a);
        a.href = textFile;
        a.download = fileCfg && fileCfg.fileName ? fileCfg.fileName : resFileName; // 优先取自义定名称

        a.click();
        window.URL.revokeObjectURL(textFile);
      }
    });
  };

  return {
    getJSON: getJSON,
    postJSON: postJSON,
    putJSON: putJSON,
    deleteJSON: deleteJSON,
    downloadFile: downloadFile,
    postFormData: postFormData
  };
};

export default createAjax;