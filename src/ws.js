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


var WebStorage = function(storage_name) {
  var storage_name_ = storage_name.charAt(0).toLowerCase()+storage_name.substr(1);
  var error = function(e) {
    alert(e.message);
    if (console) {
      console.info(storage_name+' Error!');
      console.error(e);
    }
  };

  var storage = null;

  var add = function() {
    var parse = function(file) {
      var reader = new FileReader();
      reader.onload = (function readerOnLoad(e) {
        var data = {
          name:     file.name,
          size:     file.size,
          date:     file.lastModifiedDate.getTime(),
          payload:  e.target.result
        };
        save.bind(this)(data);
      }).bind(this);

      if (file.type === 'text/plain') {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    };

    var save = function(data) {
      try {
        storage.setItem(data.name, JSON.stringify(data));
      } catch(e) {
        if (e.name == 'QuotaExceededError' ||
            e.name == 'NS_ERROR_DOM_QUOTA_REACHED') {
          this.filled = true;
        }
        this.queue = [];
        error(e);
      } finally {
        if (this.queue.length > 0) {
          if (typeof this.onprogress === 'function') this.onprogress(++this.value, this.max);
          add.bind(this)();
        } else {
          this.loading = false;
          this.getAll();
        }
      }
    };

    var entry = this.queue.shift();
    switch (entry.toString().replace(/\[object (.*?)\]/, '$1')) {
      case 'Blob':
        // Support for drag & drop with folders
        parse.bind(this)(entry);
        break;

      case 'File':
      case 'FileEntry':
        // Support for input[type=file]
        entry.file(parse.bind(this));
        break;

      default:
        // Special case to support IE9 which has WebStorage support but Blob support
        save.bind(this)(entry);
        break;
    }
  };

  var ws = function() {
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

    if (window[storage_name_]) {
      this.supported = true;
      storage = window[storage_name_];
      this.getAll();
    } else {
      console.info(storage_name+' not supported on this browser');
      return;
    }
  };
  ws.prototype = {
    add: function(fileEntry) {
      if (!storage) return;
      this.queue.push(fileEntry);
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
      for (var i = 0; i < storage.length; i++) {
        var key = storage.key(i);
        var data = storage[key];
        try {
          data = JSON.parse(data);
        } catch(e) {
          // dummy
        } finally {
          if (!data.payload) {
            // Fill dummy if data is invalid
            data = {
              name: key,
              size: 0,
              date: new Date(),
              payload: data
            };
          }
        }
        size += data.size;
        // Actual data is not needed
        delete data.payload;
        table.push(data);
      }
      setTimeout((function getAllSetTimeout() {
        this.table = table;
        this.total = size;
        this.loading = false;
        if (typeof this.oncomplete === 'function') this.oncomplete();
      }).bind(this), 0);
    },
    deleteAll: function() {
      if (!this.supported || this.loading) return;
      this.table = [];
      this.loading = true;
      this.filled = false;
      var length = storage.length;
      for (var i = 0; i < length; i++) {
        try {
          storage.removeItem(storage.key(0));
        } catch(e) {
          error(e);
        }
      }
      this.loading = false;
      this.getAll();
    }
  };
  return function() {
    return new ws();
  }
}
app.factory('LocalStorage', WebStorage('LocalStorage'));
app.factory('SessionStorage', WebStorage('SessionStorage'));
