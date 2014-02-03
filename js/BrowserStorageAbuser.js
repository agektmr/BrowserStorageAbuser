/*! BrowserStorageAbuser - v0.1.0 - 2014-02-03
* Copyright (c) 2014 ; Licensed  */
var app = angular.module('BrowserStorageAbuser', []);

app.value('storages', [
  {
    name: 'FileSystem',
    desc: 'The File System API simulates a local file system that web apps can navigate around. You can develop apps that can read, write, and create files and directories in a virtual, sandboxed file system.',
    link: 'https://developer.mozilla.org/docs/WebGuide/API/File_System'
  },
  {
    name: 'IndexedDB',
    desc: 'IndexedDB is an API for client-side storage of significant amounts of structured data and for high performance searches on this data using indexes. While DOM Storage is useful for storing smaller amounts of data, it is less useful for storing larger amounts of structured data. IndexedDB provides a solution.',
    link: 'https://developer.mozilla.org/docs/IndexedDB'
  },
  {
    name: 'WebSQL',
    desc: 'Web SQL Database is a web page API for storing data in databases that can be queried using a variant of SQL. The API is supported by Google Chrome, Opera, Safari and the Android Browser. The W3C Web Applications Working Group ceased working on the specification in November 2010, citing a lack of independent implementations (i.e., the use of a database system other than SQLite as the backend) as the reason the specification could not move forward to become a W3C Recommendation. One potential alternative storage standard is IndexedDB.',
    link: 'http://wikipedia.org/wiki/Web_SQL_Database'
  },
  {
    name: 'LocalStorage',
    desc: 'DOM Storage is the name given to the set of storage-related features first introduced in the Web Applications 1.0 specification, and now split off into its own W3C Web Storage specification. DOM Storage is designed to provide a larger, more secure, and easier-to-use alternative to storing information in cookies. It was first introduced with Firefox 2 and Safari 4.',
    link: 'https://developer.mozilla.org/docs/Web/Guide/API/DOM/Storage'
  },
  {
    name: 'SessionStorage',
    desc: 'DOM Storage is the name given to the set of storage-related features first introduced in the Web Applications 1.0 specification, and now split off into its own W3C Web Storage specification. DOM Storage is designed to provide a larger, more secure, and easier-to-use alternative to storing information in cookies. It was first introduced with Firefox 2 and Safari 4.',
    link: 'https://developer.mozilla.org/docs/Web/Guide/API/DOM/Storage'
  }
]);


'use strict';

app.factory('FileSystem', ['$window', function($window) {
  var requestFileSystem = $window.requestFileSystem ||
                          $window.webkitRequestFileSystem ||
                          $window.mozRequestFileSystem ||
                          $window.msRequestFileSystem ||
                          undefined;

  var error = function(e) {
    if (e.name === 'QuotaExceededError') {
      this.filled = true;
      alert(e.message);
    }
    if (console) {
      console.error(e.message);
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
        writer.onerror = (function(e) {
          // call error function with FileError object
          error.bind(this)(e.target.error);
        }).bind(this);

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
      this.open('TEMPORARY', 0, (function() {
        this.getAll();
      }).bind(this));
    } else {
      console.info('FileSystem API not supported on this browser');
      return;
    }
  };
  fs.prototype = {
    open: function(storage_type, length, callback) {
      requestFileSystem($window[storage_type], length, (function(fs) {
        this.supported = true;
        this.storage = fs;
        if (typeof callback === 'function') callback();
      }).bind(this), function(e) {
        this.supported = false;
        console.error(e.message);
        if (typeof callback === 'function') callback();
      });
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
        var length = results.length;
        if (length > 0) {
          var c = 0;
          Array.prototype.forEach.call(results, (function ArrayForEach(result) {
            if (result.isFile) {
              result.file((function fileRead(file) {
                file.date = file.lastModifiedDate;
                size += file.size;
                table.push(file);
                if (++c === length) {
                  this.table = table;
                  this.total = size;
                  this.loading = false;
                  if (typeof this.oncomplete === 'function') this.oncomplete();
                }
              }).bind(this));
            } else {
              length--;
              if (length === 0) {
                this.table = table;
                this.total = size;
                this.loading = false;
                if (typeof this.oncomplete === 'function') this.oncomplete();
              }
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
        var length = results.length;
        if (length > 0) {
          var c = 0;
          Array.prototype.forEach.call(results, (function ArrayForEach(result) {
            if (result.isFile) {
              result.remove((function fileRemove() {
                if (++c == length) {
                  this.filled = false;
                  this.loading = false;
                  this.getAll();
                }
              }).bind(this), error.bind(this));
            } else {
              length--;
              if (length === 0) {
                this.filled = false;
                this.loading = false;
                this.getAll();
              }
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

'use strict';

app.factory('Quota', ['FileSystem', '$window', function(fs, $window) {
  var temporaryStorage =  $window.navigator.temporaryStorage ||
                          $window.navigator.webkitTemporaryStorage ||
                          $window.navigator.mozTemporaryStorage ||
                          $window.navigator.msTemporaryStorage ||
                          undefined;
  var persistentStorage = $window.navigator.persistentStorage ||
                          $window.navigator.webkitPersistentStorage ||
                          $window.navigator.mozPersistentStorage ||
                          $window.navigator.msPersistentStorage ||
                          undefined;
  var storageQuota      = $window.navigator.storageQuota ||
                          undefined;

  var error = function(e) {
    alert('Error! '+e.message);
    console.error('Quota Management Error:', e.message);
    console.trace();
  };

  var Quota = function() {
    this.usage = 0;
    this.quota = 0;
    this.disp_usage = 0;
    this.disp_quota = 0;
    this.storage_type = 'TEMPORARY';
    this.storage = null;
    this.supported = false;
    this.oncomplete = null;
    if (!temporaryStorage || !persistentStorage) {
      console.info('Quota Management API not supported on this browser');
      return;
    }
    this.supported = true;
    this.storage = this.storage_type === 'TEMPORARY' ? temporaryStorage : persistentStorage;
    this.request_usage();
  };
  Quota.prototype = {
    change_file_system: function() {
      if (!this.supported) return;
      this.storage = this.storage_type === 'TEMPORARY' ? temporaryStorage : persistentStorage;
      fs.open(this.storage_type, this.quota, (function() {
        this.request_usage();
      }).bind(this));
    },
    request_quota: function(callback) {
      if (!this.supported || this.storage_type != 'PERSISTENT') return;
      if (storageQuota) {
        // The new Quota Management API
        storageQuota.requestPersistentQuota(this.disp_quota * 1024 * 1024).then(
        (function(storageInfo) {
          this.quota = storageInfo.quota;
          this.usage = storageInfo.usage;
          this.disp_quota = ~~(storageInfo.quota / 1024 / 1024);
          this.disp_usage = ~~(storageInfo.usage / 1024 / 1024);
          this.change_file_system();
        }).bind(this), error);
      } else {
        this.storage.requestQuota(this.disp_quota * 1024 * 1024,
        (function(quota) {
          this.quota = quota;
          this.disp_quota = ~~(quota / 1024 / 1024);
          this.change_file_system();
        }).bind(this), error);
      }
    },
    request_usage: function() {
      if (!this.supported) return;
      if (storageQuota) {
        // The new Quota Management API
        storageQuota.queryInfo(this.storage_type.toLowerCase()).then(
        (function(storageInfo) {
          this.quota = storageInfo.quota;
          this.usage = storageInfo.usage;
          this.disp_quota = ~~(storageInfo.quota / 1024 / 1024);
          this.disp_usage = ~~(storageInfo.usage / 1024 / 1024);
          if (typeof this.oncomplete === 'function') this.oncomplete();
        }).bind(this), error);
      } else {
        this.storage.queryUsageAndQuota(
        (function(usage, quota) {
          this.quota = quota;
          this.usage = usage;
          this.disp_quota = ~~(quota / 1024 / 1024);
          this.disp_usage = ~~(usage / 1024 / 1024);
          if (typeof this.oncomplete === 'function') this.oncomplete();
        }).bind(this), error);
      }
    }
  };
  return new Quota();
}]);

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

app.controller('MainCtrl', ['$scope', '$timeout', 'storages', 'Quota', function($scope, $timeout, storages, Quota) {
  $scope.storages = storages;

  var error_callback = function() {
    alert('Error!');
  };

  var getNow = function() {
    return window.performance && performance.now ?
           (performance.now() + performance.timing.navigationStart) :
           Date.now();
  }

  $scope.start = 0;
  $scope.duration_log = [];

  $scope.time_lap = function() {
    var now = getNow();
    if ($scope.start !== 0) {
      var duration = now - $scope.start;
      // silly hack but skip first one
      if ($scope.duration_log.length > 0) {
        console.log(duration / 1000, 'sec');
      }
      $scope.start = now;
      $scope.duration_log.push(duration);
    } else {
      $scope.start = now;
    }
  };
  $scope.time_finish = function() {
    if ($scope.start !== 0) {
      var now = getNow()
      var duration = now - $scope.start;
      console.log(duration / 1000, 'sec');
      $scope.duration_log.push(duration);

      var total = 0,
          i = 1; // starts from 1 for same silly reason
      while ($scope.duration_log[i] !== undefined) {
        total += $scope.duration_log[i++];
      };
      console.log('average:', total/$scope.duration_log.length/1000, 'sec');

      $scope.start = 0;
      $scope.duration_log = [];
    }
  };

  $scope.update = function() {
    $scope.$broadcast('update');
  };

  $scope.calc_quota = function() {
    Quota.request_usage();
  };

  $scope.set_working_storage = function(name) {
    for (var i = 0; i < $scope.storages.length; i++) {
      if ($scope.storages[i].name === name) {
        $scope.working_storage = $scope.storages[i].source;
      }
    }
  };
}]);

app.directive('quotaTable', ['Quota', function(quota) {
  return {
    restrict: 'A',
    controller: function($scope, Quota) {
      $scope.source = Quota;
      $scope.source.oncomplete = function() {
        if (!$scope.$$phase) $scope.$apply();
      };
      $scope.change_file_system = function() {
        $scope.source && $scope.source.change_file_system(function() {
          $scope.update();
        });
      };

      $scope.request_quota = function() {
        $scope.source.request_quota(function() {
          $scope.update();
        });
      };
    },
    link: function(scope, elem, attr) {
      scope.$on('update', function() {
        scope.source.request_usage();
      });
    }
  }
}]);

app.directive('storageTable', [
              'storages',
              'FileSystem',
              'IndexedDB',
              'WebSQL',
              'LocalStorage',
              'SessionStorage',
              function(storages, fs, idb, sql, ls, ss) {
  for (var i = 1; i < arguments.length; i++) {
    storages[i - 1].source = arguments[i];
  }
  var addMultiple = function(entry, add) {
    var reader = entry.createReader();
    reader.readEntries(function(results) {
      Array.prototype.forEach.call(results, function(result) {
        if (result.isFile) {
          add(result);
        } else {
          addMultiple(result, add);
        }
      });
    });
  };

  return {
    restrict: 'E',
    templateUrl: 'storage-table.html',
    controller: function($scope, storages) {
      $scope.source = storages[$scope.$index].source;
      $scope.source.onprogress = function(value, max) {
        $scope.time_lap();
        $scope.$emit('progress', value, max);
      };

      $scope.source.oncomplete = function() {
        $scope.time_finish();
        $scope.calc_quota();
        if (!$scope.$$phase) $scope.$apply();
      };

      $scope.upload = function() {
        $scope.file_input.click();
      };

      $scope.open_fill_storage = function() {
        $scope.set_working_storage($scope.data.name);
        $scope.$emit('open_fill_storage');
      };

      $scope.delete_all = function() {
        if (confirm('Do you really want to delete all?')) {
          $scope.source.deleteAll();
        }
      };
    },
    link: function(scope, elem, attr) {
      scope.hover = false;
      scope.total_size = '0.0MB';
      scope.file_input = elem.find('input')[0];

      // Why can't this be elem.find('input[type="file"]') ?
      scope.file_input.onchange = function(e) {
        Array.prototype.forEach.call(e.target.files, function(file) {
          scope.time_lap();
          scope.source.add(file);
        });
      };

      scope.$watch('source.loading', function(loading) {
        if (!loading) {
          scope.$emit('close_progress');
        }
      });

      scope.$on('update', function() {
        console.log(scope.data.name+' is updating');
        scope.time_lap();
        scope.source.getAll();
      });

      elem.bind('dragleave', function(e) {
        e.preventDefault();
        scope.hover = false;
        scope.$apply();
      });
      elem.bind('dragover', function(e) {
        e.preventDefault();
        scope.hover = true;
        scope.$apply();
      });
      elem.bind('drop', function(e) {
        scope.hover = false;
        e.preventDefault();
        if (scope.source.loading) return;
        // If directory is given
        var transfer = e.originalEvent.dataTransfer;
        if (transfer.items) {
          Array.prototype.forEach.call(transfer.items, function(item) {
            if (item) {
              var entry = item.webkitGetAsEntry();
              if (entry.isDirectory) {
                addMultiple(entry, scope.source.add.bind(scope.source));
              } else {
                scope.time_lap();
                scope.source.add(entry);
              }
            }
          });
        // If multiple files are given
        } else {
          Array.prototype.forEach.call(transfer.files, function(file) {
            scope.source.add(file);
          });
        }
        scope.$emit('progress', 0, 10);
        scope.$apply();
      });
    }
  };
}]);

app.directive('fillStorage', function() {
  var Blob        = window.Blob ||
                    window.WebKitBlob ||
                    window.MozBlob ||
                    window.MsBlob ||
                    undefined;

  var BlobBuilder = window.BlobBuilder ||
                    window.WebKitBlobBuilder ||
                    window.MozBlobBuilder ||
                    window.MsBlobBuilder ||
                    undefined;

  return {
    restrict: 'E',
    templateUrl: 'fill-storage.html',
    controller: function($scope) {
      $scope.chunk_selections = [
        1024 * 5,               // 5KB
        1024 * 5 * 10,          // 50KB
        1024 * 5 * 100,         // 500KB
        1024 * 1024 * 5,        // 5MB
        1024 * 1024 * 5 * 10,   // 50MB
        1024 * 1024 * 5 * 100   // 500MB
      ];
      $scope.chunk_size = 1024 * 1024 * 5;
      $scope.quantity = 1;
      $scope.fill = function() {
        $scope.$emit('close_fill_storage');
        // $scope.$emit('progress', 0, $scope.quantity);
        var size = $scope.chunk_size / 4; // chunk will be repetition of 4B
        var content = (new Array(size+1)).join('aあ');
        $scope.time_lap();
        for (var i = 0; i < $scope.quantity; i++) {
          var blob = null;
          if (Blob !== undefined || BlobBuilder !== undefined) {
            // Android 4.2 Browser has "Blob" object but generates exception
            try {
              blob = new Blob([content], {type: 'text/plain'});
            } catch(e) {
              var bb = new BlobBuilder();
              bb.append(content);
              blob = bb.getBlob({type: 'text/plain'});
            }
          } else {
            blob = {
              size:     $scope.chunk_size,
              payload:  content
            };
          }
          // now is the generated time
          blob.lastModifiedDate = new Date();
          // Name it random so key won't conflict
          blob.name = (~~(Math.random()*100000)+100000)+'.txt';
          $scope.time_lap();
          $scope.working_storage.add(blob);
        }
      };
    },
    link: function(scope, elem, attr) {
      scope.dialog = elem.find('>div');
      scope.$on('open_fill_storage', function() {
        scope.dialog.modal('show');
      });
      scope.$on('close_fill_storage', function() {
        scope.dialog.modal('hide');
      });
    }
  };
});

app.directive('storageProgress', function() {
  return {
    restrict: 'E',
    templateUrl: 'storage-progress.html',
    link: function(scope, elem, attr) {
      scope.value = 0;
      scope.max = 0;
      scope.progress = elem.find('>div');
      scope.$on('progress', function(e, value, max) {
        scope.value = value;
        scope.max = max;
        if (scope.progress.css('display') == 'none') {
          elem.find('.progress-bar').css('width', '0%');
          scope.progress.modal('show');
        }
        if (value !== 0 && value === max) {
          setTimeout(function() {
            scope.progress.modal('hide');
          }, 2000);
        }
        if (!scope.$$phase) scope.$apply();
      });
      scope.$on('close_progress', function() {
        scope.progress.modal('hide');
      });
    }
  };
});

app.filter('size', function() {
  return function(size_in_bytes) {
    if (typeof size_in_bytes !== 'number') return '-- KB';
    var size_in_kb = size_in_bytes / 1024;
    var size_in_mb = size_in_kb / 1024;
    var size_in_gb = size_in_mb / 1024;
    return size_in_gb > 1 ? size_in_gb.toFixed(1)+'GB' : size_in_mb > 1 ? size_in_mb.toFixed(1)+'MB' : size_in_kb.toFixed(1)+'KB';
  };
});