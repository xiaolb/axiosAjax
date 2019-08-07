import { dbItem } from './types';

export default class {
    version = 1;
    projectName: string = '';
    storeName: string = 'ajax';
    db: IDBDatabase = null;
    isPending = false;
    constructor(projectName?: string | undefined) {
        this.createDB(projectName).then((res: IDBDatabase) => {
            this.db = res;
        });
    }
    // 创建db
    createDB(projectName?: string | undefined) {
        if (projectName) this.projectName = projectName;
        if (projectName && !this.storeName.includes(projectName)) {
            this.storeName = `${this.storeName}-${projectName}`;
        }
        const _this = this;
        return new Promise(resolve => {
            let request: IDBOpenDBRequest;
            _this.isPending = true;
            if (_this.db && !_this.db.objectStoreNames.contains(_this.storeName)) {
                _this.version++;
                _this.db.close();
                request = window.indexedDB.open('tops-ajax', _this.version);
            } else {
                request = window.indexedDB.open('tops-ajax');
            }

            request.onerror = function(error) {
                _this.isPending = false;
                console.error(error);
                resolve();
            };
            request.onsuccess = function() {
                _this.isPending = false;
                _this.db = request.result;
                _this.version = _this.db.version;
                resolve(_this.db);
            };
            request.onupgradeneeded = function(event: IDBVersionChangeEvent): void {
                _this.isPending = false;
                console.log('onupgradeneeded');
                if (event) {
                    _this.db = request.result;
                    if (!_this.db.objectStoreNames.contains(_this.storeName)) _this.db.createObjectStore(_this.storeName, { keyPath: 'requestmd5' });
                }
                resolve(_this.db);
            };
        });
    }

    // 检查是否有store
    async checkdbStore() {
        if (this.isPending) Promise.resolve();
        if (!this.db || !this.db.objectStoreNames.contains(this.storeName)) {
            return await this.createDB();
        }
    }
    // 获取数据
    async getData4DB(requestmd5: string) {
        await this.checkdbStore();
        return new Promise(resolve => {
            let request: IDBRequest | null;
            try {
                const transaction = this.db.transaction([this.storeName]);
                const objectStore = transaction.objectStore(this.storeName);
                request = objectStore.get(requestmd5);
            } catch (error) {
                console.log(error);
                resolve(null);
                request = null;
            }
            if (!request) return;
            request.onerror = function() {
                console.log('事务失败');
                resolve(null);
            };
            request.onsuccess = function() {
                if (request && request.result) {
                    resolve(request.result.response);
                } else {
                    resolve();
                }
            };
        });
    }
    // 保存数据
    async addData4DB(requestmd5: string, data: any) {
        await this.checkdbStore();
        if (!this.db) return;
        const result = await this.getData4DB(requestmd5);
        return new Promise((resolve, reject) => {
            let request;
            let store;
            try {
                store = this.db.transaction([this.storeName], 'readwrite').objectStore(this.storeName);
            } catch (error) {
                reject(error);
            }

            let dataTemp: dbItem = {
                requestmd5,
            };
            dataTemp.response = data;
            if (result) {
                request = store.put(dataTemp);
            } else {
                request = store.add(dataTemp);
            }
            request.onsuccess = function() {
                resolve();
            };

            request.onerror = function(event) {
                reject(event);
            };
        });
    }
}
