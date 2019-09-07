import "core-js/modules/es.symbol";
import "core-js/modules/es.array.iterator";
import "core-js/modules/es.object.get-own-property-descriptor";
import "core-js/modules/es.object.get-own-property-descriptors";
import "core-js/modules/es.object.keys";
import "core-js/modules/es.reflect.delete-property";
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
import { queryStringify, assignDeep, deepEqual, isType } from './utils';

var loop = function loop(params) {
  console.log(params);
};

var cacheDB = null;
var requestMap = {
  requests: {},
  save: function save(key, cancel) {
    if (this.requests[key]) {
      this.requests[key]();
    }

    this.requests[key] = cancel;
  },
  getKey: function getKey(req) {
    return hexMd5("".concat(req.method, "@").concat(req.baseURL).concat(req.url, "@ak=").concat(req.headers ? req.headers.Authorization || '' : ''));
  }
};
var responseMap4cache = {}; // 获取存储接口缓存的key

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

  cacheDB = new createIndexDB('tops-ajax', 'pkg', 'requestmd5');

  var preCheckCode =
  /*#__PURE__*/
  function () {
    var _ref = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee(response, opt) {
      var reader, data, key, cacheData;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              mergeOption.hideLoading(opt);

              if (!(response.request && response.request.responseType === 'blob')) {
                _context.next = 8;
                break;
              }

              if (!response.headers['content-disposition']) {
                _context.next = 4;
                break;
              }

              return _context.abrupt("return", Promise.resolve(response));

            case 4:
              // 下载出现异常处理
              reader = new FileReader();
              reader.readAsText(response.data, 'utf8');

              reader.onload = function () {
                if (this.result && typeof this.result === 'string' && !opt.isHandleError) {
                  if (this.result) return mergeOption.errorMsgHandler(JSON.parse(this.result).Message);
                } else {
                  return Promise.reject(response.data || {});
                }
              };

              return _context.abrupt("return", false);

            case 8:
              if (response) {
                _context.next = 10;
                break;
              }

              return _context.abrupt("return");

            case 10:
              data = response.data;

              if (data) {
                _context.next = 16;
                break;
              }

              if (!opt.isHandleError) {
                _context.next = 14;
                break;
              }

              return _context.abrupt("return", Promise.reject(response || {}));

            case 14:
              mergeOption.errorMsgHandler("\u7F51\u7EDC\u9519\u8BEF\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5\uFF01[".concat(response.status, "]"));
              return _context.abrupt("return", Promise.resolve(null));

            case 16:
              key = getStoreKey(opt);

              if (!(data.Code === 0)) {
                _context.next = 41;
                break;
              }

              if (!(opt.cache === false)) {
                _context.next = 39;
                break;
              }

              if (!responseMap4cache[key]) {
                _context.next = 37;
                break;
              }

              _context.prev = 20;
              _context.t0 = responseMap4cache[key].cacheData;

              if (_context.t0) {
                _context.next = 26;
                break;
              }

              _context.next = 25;
              return cacheDB.getData4DB(key);

            case 25:
              _context.t0 = _context.sent;

            case 26:
              cacheData = _context.t0;

              if (!(cacheData && deepEqual(data, cacheData))) {
                _context.next = 29;
                break;
              }

              return _context.abrupt("return", new Promise(function () {}));

            case 29:
              _context.next = 34;
              break;

            case 31:
              _context.prev = 31;
              _context.t1 = _context["catch"](20);
              console.log(_context.t1);

            case 34:
              Reflect.deleteProperty(responseMap4cache, key);
              _context.next = 38;
              break;

            case 37:
              responseMap4cache[key] = {
                loaded: true
              };

            case 38:
              data.Data && cacheDB.addData4DB(key, data);

            case 39:
              if (data.Data && isType('Object')(data.Data)) data.Data.cache = opt.cache;
              return _context.abrupt("return", Promise.resolve(data.Data));

            case 41:
              if (!opt.isHandleError) {
                _context.next = 43;
                break;
              }

              return _context.abrupt("return", Promise.reject(response.data || {}));

            case 43:
              if (!(data.Code === 302)) {
                _context.next = 46;
                break;
              }

              window.location.href = data.message + window.location.hash;
              return _context.abrupt("return", Promise.resolve(null));

            case 46:
              if (!(data.Code === 4002 || data.Code === 4000)) {
                _context.next = 49;
                break;
              }

              if (mergeOption.loginCallback && mergeOption.loginCallback instanceof Function) mergeOption.loginCallback(data);
              return _context.abrupt("return", Promise.resolve(null));

            case 49:
              if (!(response.data && response.data.Message)) {
                _context.next = 55;
                break;
              }

              mergeOption.hideLoading(opt);

              if (!opt.isHandleError) {
                _context.next = 53;
                break;
              }

              return _context.abrupt("return", Promise.reject(response.data));

            case 53:
              mergeOption.errorMsgHandler(response.data.Message);
              return _context.abrupt("return", Promise.resolve(null));

            case 55:
              return _context.abrupt("return", Promise.reject(opt.isHandleError ? response.data : {}));

            case 56:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, null, [[20, 31]]);
    }));

    return function preCheckCode(_x, _x2) {
      return _ref.apply(this, arguments);
    };
  }();

  var preReject = function preReject(err, opt) {
    mergeOption.hideLoading(opt);
    var key = getStoreKey(opt);
    Reflect.deleteProperty(responseMap4cache, key); // 请求丢失时触发

    var emptyError = {
      data: null
    };
    var response = err.response || emptyError;

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
      setTimeout(function () {
        mergeOption.hideLoading(opt);
        mergeOption.errorMsgHandler(response.data.Message);
      }, 0);
      return Promise.resolve(null);
    }

    if (err.message) {
      setTimeout(function () {
        mergeOption.hideLoading(opt);
        mergeOption.errorMsgHandler(err.message);
      }, 0);
      return Promise.resolve(null);
    } // customError表示是否自定义错误处理


    return Promise.reject(opt.isHandleError ? response.data || {} : {});
  };

  var common = function common() {
    var opt = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
      url: '',
      method: 'GET',
      loading: false,
      isHandleError: false
    };
    var cancel;
    var cancelToken = new axios.CancelToken(function (c) {
      cancel = c;
    });
    if (!window || !window.indexedDB) opt.cache = void 0;

    if (opt.loading) {
      mergeOption.showLoading(opt);
    }

    var req = _objectSpread({}, mergeOption.requestConfig, {
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

    var objectSource = opt;

    for (var key in objectSource) {
      if (objectSource.hasOwnProperty(key)) {
        if (isType('Undefined')(objectSource[key])) delete objectSource[key];
      }
    }

    var mergeReq = assignDeep(req, opt);
    requestMap.save(requestMap.getKey(mergeReq), cancel);
    return mergeOption.beforeRequestHandler(mergeReq).then(
    /*#__PURE__*/
    function () {
      var _ref2 = _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee2(res) {
        var cacheData, _key;

        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!(opt.cache === true)) {
                  _context2.next = 17;
                  break;
                }

                _key = getStoreKey(opt);
                _context2.prev = 2;
                _context2.next = 5;
                return cacheDB.getData4DB(_key);

              case 5:
                cacheData = _context2.sent;
                _context2.next = 11;
                break;

              case 8:
                _context2.prev = 8;
                _context2.t0 = _context2["catch"](2);
                console.log(_context2.t0);

              case 11:
                if (!(!cacheData || responseMap4cache[_key])) {
                  _context2.next = 14;
                  break;
                }

                Reflect.deleteProperty(responseMap4cache, _key);
                return _context2.abrupt("return", new Promise(function () {}));

              case 14:
                responseMap4cache[_key] = {
                  loaded: true,
                  cacheData: cacheData
                };
                setTimeout(function () {
                  // 清除获取缓存记录，以防下次调用时判断错误
                  Reflect.deleteProperty(responseMap4cache, _key);
                }, 5000);
                return _context2.abrupt("return", Promise.resolve({
                  data: cacheData
                }));

              case 17:
                return _context2.abrupt("return", axios(res));

              case 18:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, null, [[2, 8]]);
      }));

      return function (_x3) {
        return _ref2.apply(this, arguments);
      };
    }(), function (error) {
      return error;
    }).then(function (response) {
      return preCheckCode(response, mergeReq);
    }, function (err) {
      return preReject(err, mergeReq);
    });
  };

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
    return common(opt);
  };

  var deleteJSON = function deleteJSON(opt) {
    opt.method = 'DELETE';
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