/*
Copyright 2013 Eiji Kitamura

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Author: Eiji Kitamura (agektmr@gmail.com)
*/
'use strict';

app.factory('IndexedDB', ['$window', function($window) {
  var error = function(e) {
    if (e.name == 'QuotaExceededError') {
      this.filled = true;
      alert(e.message);
    }
    if (console) {
      console.info('IndexedDB Error!');
      console.error(e.message);
    }

    this.queue = [];
    this.loading = false;
    this.getAll();
  };

  var version = 3,
      db = null;

  var add = function() {
    var save = function(file) {
      var reader = new FileReader();
      reader.onload = (function(e) {
        var data = {
          name: file.name,
          size: file.size,
          date: file.lastModifiedDate.getTime(),
          payload: e.target.result
        };
        var transaction = db.transaction(['entries'], 'readwrite');
        transaction.oncomplete = (function onTransactionComplete(e) {
          if (this.queue.length > 0) {
            if (typeof this.onprogress === 'function') this.onprogress(++this.value, this.max);
            add.bind(this)();
          } else {
            this.loading = false;
            this.getAll();
          }
        }).bind(this);
        transaction.onerror = error.bind(this);
        transaction.onabort = (function onTransactionAboart(e) {
          error.bind(this)(e.target.error);
        }).bind(this);

        var store = transaction.objectStore('entries');
        var req = store.put(data);
        req.onerror = function(e) {
          console.log(e);
        };
      }).bind(this);

      if (file.type === 'text/plain') {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    };

    var entry = this.queue.shift();
    if (entry instanceof Blob) {
      save.bind(this)(entry);
    } else {
      entry.file(save.bind(this));
    }
  };

  var idb = function() {
    this.supported  = false;
    this.filled     = false;
    this.loading    = false;
    this.oncomplete = null;
    this.onprogress = null;
    this.queue = [];
    this.value = 0;
    this.max   = 0;
    this.table = [];
    this.total = 0;
    if (!$window.indexedDB) {
      console.info('Indexed Database API not supported on this browser');
      return;
    }

    var req = $window.indexedDB.open('BrowserStorageAbuser', version);
    req.onsuccess = (function(e) {
      db = e.target.result;
      this.supported  = true;
      this.getAll();
    }).bind(this);
    req.onerror = error.bind(this);
    req.onupgradeneeded = (function requestOnUpgradeNeeded(e) {
      db = e.target.result;
      if (db.objectStoreNames.contains('entries')) {
        db.deleteObjectStore('entries');
      }
      db.createObjectStore('entries', {autoIncrement: true});
      console.info('upgraded IndexedDB');
    }).bind(this);
  };
  idb.prototype = {
    add: function(entry) {
      if (!this.supported) return;
      this.queue.push(entry);
      this.max = this.queue.length;
      if (this.loading === false) {
        this.value = 0;
        this.loading = true;
        if (typeof this.onprogress === 'function') this.onprogress(this.value, this.max);
        add.bind(this)();
      }
    },
    getAll: function() {
      if (!this.supported || this.loading) return;
      var table = [];
      var size = 0;
      this.loading = true;

      var transaction = db.transaction(['entries'], 'readonly');
      transaction.oncomplete = (function transactionOnComplete() {
        this.table = table;
        this.total = size;
        this.loading = false;
        if (typeof this.oncomplete === 'function') this.oncomplete();
      }).bind(this);
      transaction.onerror = error.bind(this);

      var req = transaction.objectStore('entries').openCursor();
      req.onsuccess = (function requestOnSuccess(e) {
        var cursor = e.target.result;
        if (cursor) {
          var data = cursor.value;
          size += data.size;
          // Actual data is not needed
          delete data.payload;
          table.push(data);
          cursor.continue();
        }
      }).bind(this);
      req.onerror = error.bind(this);
    },
    deleteAll: function() {
      if (!this.supported || this.loading) return;
      this.table = [];
      this.loading = true;

      var transaction = db.transaction(['entries'], 'readwrite');
      transaction.oncomplete = (function transactionOnComplete() {
        this.filled = false;
        this.loading = false;
        this.getAll();
      }).bind(this);
      transaction.onerror = error.bind(this);

      var store = transaction.objectStore('entries');
      var req = store.openCursor();
      req.onsuccess = (function requestOnSuccess(e) {
        var cursor = e.target.result;
        if (cursor) {
          store.delete(cursor.key);
          cursor.continue();
        }
      }).bind(this);
      req.onerror = error.bind(this);
    }
  };
  return new idb();
}]);