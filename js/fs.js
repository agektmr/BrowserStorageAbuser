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

app.factory('FileSystem', ['$window', function($window) {
  var requestFileSystem = $window.requestFileSystem ||
                          $window.webkitRequestFileSystem ||
                          $window.mozRequestFileSystem ||
                          $window.msRequestFileSystem ||
                          undefined;

  var error = function(e) {
    if (e.code === e.QUOTA_EXCEEDED_ERR) {
      this.filled = true;
      alert('Quota Exceeded!');
    }
    if (console) {
      console.error('FileSystem Error!', e);
      console.trace && console.trace();
    }

    this.queue = [];
    this.loading = false;
    if (typeof this.oncomplete === 'function') this.oncomplete();
  };

  var add = function() {
    var entry = this.queue.shift();
    this.storage.root.getFile(entry.name, {create: true, exclusive: false}, (function getFile(fileEntry) {
      fileEntry.createWriter((function createWriter(writer) {
        writer.onwriteend = (function writerWriteEnd(e) {
          if (this.queue.length > 0) {
            if (typeof this.onprogress === 'function') this.onprogress(++this.value, this.max);
            add.bind(this)();
          } else {
            this.loading = false;
            this.getAll();
          }
        }).bind(this);
        writer.onerror = error.bind(this);

        // Write directly if entry is instance of Blob
        if (entry instanceof Blob) {
          writer.write(entry);
        } else {
          // Otherwise, this should be FileEntry
          entry.file(function(file) {
            writer.write(file);
          });
        }
      }).bind(this));
    }).bind(this), error.bind(this));
  };

  var fs = function() {
    this.supported = false;
    this.storage = null;
    this.filled = false;
    this.loading = false;
    this.oncomplete = null;
    this.onprogress = null;
    this.queue = [];
    this.value = 0;
    this.max = 0;
    this.table = [];
    this.total = 0;
    if (requestFileSystem) {
      this.supported = true;
      this.open('TEMPORARY', 0, (function() {
        this.getAll();
      }).bind(this));
    }
  };
  fs.prototype = {
    open: function(storage_type, length, callback) {
      requestFileSystem($window[storage_type], length, (function(fs) {
        this.supported = true;
        this.storage = fs;
        if (typeof callback === 'function') callback();
      }).bind(this), error);
    },
    add: function(fileEntry) {
      if (!this.supported) return;
      this.queue.push(fileEntry);
      this.max = this.queue.length;
      if (!this.loading) {
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
      var reader = this.storage.root.createReader();
      reader.readEntries((function readerReadEntries(results) {
        if (results.length > 0) {
          var c = 0;
          Array.prototype.forEach.call(results, (function ArrayForEach(result) {
            if (result.isFile) {
              result.file((function fileRead(file) {
                file.date = file.lastModifiedDate;
                size += file.size;
                table.push(file);
                if (++c === results.length) {
                  this.table = table;
                  this.total = size;
                  this.loading = false;
                  if (typeof this.oncomplete === 'function') this.oncomplete();
                }
              }).bind(this));
            }
          }).bind(this));
        } else {
          this.table = table;
          this.total = 0;
          this.loading = false;
          if (typeof this.oncomplete === 'function') this.oncomplete();
        }
      }).bind(this),
      error.bind(this));
    },
    deleteAll: function() {
      if (!this.supported || this.loading) return;
      this.table = [];
      this.loading = true;
      var reader = this.storage.root.createReader();
      reader.readEntries((function readerReadEntries(results) {
        if (results.length > 0) {
          var c = 0;
          Array.prototype.forEach.call(results, (function ArrayForEach(result) {
            if (result.isFile) {
              result.remove((function fileRemove() {
                if (++c == results.length) {
                  this.filled = false;
                  this.loading = false;
                  this.getAll();
                }
              }).bind(this), error.bind(this));
            }
          }).bind(this));
        } else {
          this.loading = false;
        }
      }).bind(this),
      error.bind(this));
    }
  };
  return new fs();
}]);
