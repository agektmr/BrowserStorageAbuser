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

var idb = (function() {
  var error = function(e) {
    if (e.code && e.code === e.QUOTA_EXCEEDED_ERR) {
      this.filled = true;
      alert('Quota Exceeded!');
    }
    if (console) {
      console.error('IndexedDB Error!', e);
      console.trace && console.trace();
    }

    this.queue = [];
    this.loading = false;
    this.getAll();
    if (typeof this.oncomplete === 'function') this.oncomplete();
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
        transaction.oncomplete = (function transactionOnComplete(e) {
          if (this.queue.length > 0) {
            if (typeof this.onprogress === 'function') this.onprogress(++this.value, this.max);
            add.bind(this)();
          } else {
            this.loading = false;
            this.getAll();
            if (this.scope) {
              if (typeof this.oncomplete === 'function') this.oncomplete();
              this.scope.$apply();
            }
          }
        }).bind(this);
        transaction.onerror = error.bind(this);
        transaction.onabort = (function transactionOnAboart(e) {
          // e(Event).target(IDBTransaction).error(DOMError)
          if (e.target.error && e.target.error.name === 'QuotaExceededError') {
            this.filled = true;
            alert('Quota Exceeded!');
          }
          error.bind(this)(e);
        }).bind(this);

        var store = transaction.objectStore('entries');
        store.put(data);
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
    if (!window.indexedDB) {
      throw 'Indexed Database API not supported on this browser';
    }
    this.filled     = false;
    this.loading    = false;
    this.scope      = null;
    this.oncomplete = null;
    this.onprogress = null;
    this.queue = [];
    this.value = 0;
    this.max   = 0;
    this.table = [];
    this.total = 0;

    var req = indexedDB.open('QuotaManagement', version);
    req.onsuccess = (function(e) {
      db = e.target.result;
      this.supported = true;
      this.getAll(); // Initial load come here since this comes after opening database
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
      if (!db) return;
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
      if (!db || this.loading) return;
      var table = [];
      var size = 0;
      this.loading = true;

      var transaction = db.transaction(['entries'], 'readonly');
      transaction.oncomplete = (function transactionOnComplete() {
        this.table = table;
        this.total = size;
        this.loading = false;
        if (this.scope) {
          if (typeof this.oncomplete === 'function') this.oncomplete();
          this.scope.$apply();
        }
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
      if (!db || this.loading) return;
      this.table = [];
      this.loading = true;

      var transaction = db.transaction(['entries'], 'readwrite');
      transaction.oncomplete = (function transactionOnComplete() {
        this.filled = false;
        this.loading = false;
        this.getAll();
        if (this.scope) {
          if (typeof this.oncomplete === 'function') this.oncomplete();
          this.scope.$apply();
        }
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
})();