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

var sql = (function(quota) {
  var error = function(e) {
    if (e.code === e.QUOTA_ERR) {
      this.filled = true;
      alert('Quota Exceeded!');
    }
    if (console) {
      console.error('WebSQL Error!', e);
      console.trace && console.trace();
    }

    this.queue = [];
    this.loading = false;
    if (e.code === e.QUOTA_ERR) {
      this.getAll();
    }
    if (this.scope) {
      if (typeof this.oncomplete === 'function') this.oncomplete();
      this.scope.$apply();
    }
  };

  var version = '1.0',
      db = null;

  var add = function() {
    var save = function(file) {
      var reader = new FileReader();
      reader.onload = (function(e) {
        var data = [
          file.name,
          file.size,
          file.lastModifiedDate.getTime(),
          e.target.result
        ];
        db.transaction((function transactionOnCallback(transaction) {
          transaction.executeSql('INSERT INTO entries (name, size, date, payload) VALUES(?, ?, ?, ?)', data,
          (function executeSqlOnCallback(t, results) {
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
          }).bind(this), (function(t, e) {
            error.bind(this)(e);
          }).bind(this));
        }).bind(this),
        error.bind(this));
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

  var sql = function(quota) {
    this.supported = false;
    if (!window.openDatabase) {
      throw 'WebSQL database not supported on this browser';
    }
    this.supported  = true;
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
    db = openDatabase('QuotaManagement', '', 'QuotaManagement', quota && quota.quota || 1 * 1024 * 1024);
    if (db.version !== version) {
      db.changeVersion(db.version, version, (function changeVersionOnCallback(transaction) {
        // transaction.executeSql('DROP TABLE entries');
        transaction.executeSql('CREATE TABLE entries ('+
          'id          INTEGER PRIMARY KEY AUTOINCREMENT, '+
          'name        TEXT, '+
          'size        INTEGER, '+
          'date        INTEGER, '+
          'payload     TEXT)', [],
        (function executeSqlOnCallback(t) {
          console.info('Created new table on WebSQL');
        }).bind(this),
        (function executeSqlOnError(t, e) {
          error.bind(this)(e);
        }).bind(this));

      }).bind(this), (function changeVersionOnError(e) {
        console.error('WebSQL Error!', e);
        throw 'WebSQL Error!';

      }).bind(this), (function changeVersionOnSuccess() {
        console.info('upgraded WebSQL');

      }).bind(this));
    }
    this.getAll();
  };
  sql.prototype = {
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
      var size = 0;
      this.loading = true;
      db.readTransaction((function readTransactionOnCallback(transaction) {
        transaction.executeSql('SELECT * FROM entries', [],
            (function executeSqlOnCallback(t, results) {
          var table = [];
          for (var i = 0; i < results.rows.length; i++) {
            var data = {
              name: results.rows.item(i).name,
              size: results.rows.item(i).size,
              date: results.rows.item(i).date
            }
            size += data.size;
            table.push(data);
          }
          this.table = table;
          this.total = size;
          this.loading = false;
          if (this.scope) {
            if (typeof this.oncomplete === 'function') this.oncomplete();
            this.scope.$apply();
          }
        }).bind(this),
        (function executeSqlOnError(t, e) {
          // SQLError
          error.bind(this)(e);
        }).bind(this));
      }).bind(this),
      error.bind(this));
    },
    deleteAll: function() {
      if (!db || this.loading) return;
      this.table = [];
      this.loading = true;
      db.transaction((function transactionOnCallback(transaction) {
        transaction.executeSql('DELETE FROM entries', [],
            (function executeSqlOnCallback(t, results) {
          this.filled = false;
          this.loading = false;
          this.getAll();
          if (this.scope) {
            if (typeof this.oncomplete === 'function') this.oncomplete();
            this.scope.$apply();
          }
        }).bind(this),
        (function executeSqlOnError(t, e) {
          error.bind(this)(e);
        }).bind(this));
      }).bind(this),
      error.bind(this));
    }
  };
  return new sql(quota);
})(Quota);