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

app.factory('WebSQL', ['Quota', '$window', function(quota, $window) {
  var error = function(e) {
    if (e.code === e.QUOTA_ERR) {
      this.filled = true;
      alert(e.message);
    }
    if (console) {
      console.info('WebSQL Error!');
      console.error(e.message);
    }

    this.queue = [];
    this.loading = false;
    this.getAll();
  };

  var version = '1.0',
      name = 'BrowserStorageAbuser',
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
        db.transaction((function onTransactionCallback(transaction) {
          transaction.executeSql('INSERT INTO entries (name, size, date, payload) VALUES(?, ?, ?, ?)', data,
          (function onExecuteSqlCallback(t, results) {
            if (this.queue.length > 0) {
              if (typeof this.onprogress === 'function') this.onprogress(++this.value, this.max);
              add.bind(this)();
            } else {
              this.loading = false;
              this.getAll();
            }
          }).bind(this),
          (function onExecuteSqlError(t, e) {
            error.bind(this)(e);
            // Returning true to rollback. false to continue;
            return false;
          }).bind(this));
        }).bind(this),
        (function onTransactionError(e) {
          // If Quota Error, error caughts here.
          // At this point, user might have given either permission or not.
          // There's no good way to check if permission was given or not.
          if (e.code === e.QUOTA_ERR) {
            error.bind(this)(e);
          }
        }).bind(this),
        (function onTransactionSuccess() {
          console.log('Transaction successful.');
        }).bind(this));
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

  var sql = function() {
    this.supported = false;
    this.filled     = false;
    this.loading    = false;
    this.oncomplete = null;
    this.onprogress = null;
    this.queue = [];
    this.value = 0;
    this.max   = 0;
    this.table = [];
    this.total = 0;
    if (!$window.openDatabase) {
      console.info('WebSQL database not supported on this browser');
      return;
    }

    try {
      db = openDatabase(name, '', name, 1 * 1024 * 1024);
    } catch (e) {
      console.error(e.message);
      this.supported = false;
      return;
    }
    this.supported  = true;
    if (db.version !== version) {
      db.changeVersion(db.version, version,
     (function onChangeVersionCallback(transaction) {
        // transaction.executeSql('DROP TABLE entries');
        transaction.executeSql('CREATE TABLE entries ('+
          'id          INTEGER PRIMARY KEY AUTOINCREMENT, '+
          'name        TEXT, '+
          'size        INTEGER, '+
          'date        INTEGER, '+
          'payload     TEXT)', [],
        (function onExecuteSqlCallback(t) {
          this.getAll();
          console.info('Created new table on WebSQL');
        }).bind(this),
        (function onExecuteSqlError(t, e) {
          error.bind(this)(e);
        }).bind(this));

      }).bind(this),
      (function onChangeVersionError(e) {
        console.error('WebSQL Error!', e);
        this.supported = false;
        throw 'WebSQL Error!';

      }).bind(this),
      (function onChangeVersionSuccess() {
        this.getAll();
        console.info('upgraded WebSQL');

      }).bind(this));
    } else {
      this.getAll();
    }
  };
  sql.prototype = {
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
      var size = 0;
      this.loading = true;
      db.readTransaction(
      (function onReadTransactionCallback(transaction) {
        transaction.executeSql('SELECT * FROM entries', [],
        (function onExecuteSqlCallback(t, results) {
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
          if (typeof this.oncomplete === 'function') this.oncomplete();
        }).bind(this),
        (function onExecuteSqlError(t, e) {
          // SQLError
          error.bind(this)(e);
        }).bind(this));
      }).bind(this),
      error.bind(this));
    },
    deleteAll: function() {
      if (!this.supported || this.loading) return;
      this.table = [];
      this.loading = true;
      db.transaction((function onTransactionCallback(transaction) {
        transaction.executeSql('DELETE FROM entries', [],
        (function onExecuteSqlCallback(t, results) {
          this.filled = false;
          this.loading = false;
          this.getAll();
        }).bind(this),
        (function onExecuteSqlError(t, e) {
          error.bind(this)(e);
        }).bind(this));
      }).bind(this),
      error.bind(this));
    }
  };
  return new sql();
}]);