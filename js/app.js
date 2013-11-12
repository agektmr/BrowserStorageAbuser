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
var app = angular.module('BrowserStorageAbuser', []);

app.value('quota',  Quota);
app.value('storages', {
  FileSystem: {
    desc: 'The File System API simulates a local file system that web apps can navigate around. You can develop apps that can read, write, and create files and directories in a virtual, sandboxed file system.',
    link: 'https://developer.mozilla.org/docs/WebGuide/API/File_System',
    source: fs
  },
  IndexedDB: {
    desc: 'IndexedDB is an API for client-side storage of significant amounts of structured data and for high performance searches on this data using indexes. While DOM Storage is useful for storing smaller amounts of data, it is less useful for storing larger amounts of structured data. IndexedDB provides a solution.',
    link: 'https://developer.mozilla.org/docs/IndexedDB',
    source: idb
  },
  WebSQL: {
    desc: 'Web SQL Database is a web page API for storing data in databases that can be queried using a variant of SQL. The API is supported by Google Chrome, Opera, Safari and the Android Browser. The W3C Web Applications Working Group ceased working on the specification in November 2010, citing a lack of independent implementations (i.e., the use of a database system other than SQLite as the backend) as the reason the specification could not move forward to become a W3C Recommendation. One potential alternative storage standard is IndexedDB.',
    link: 'http://wikipedia.org/wiki/Web_SQL_Database',
    source: sql
  },
  LocalStorage: {
    desc: 'DOM Storage is the name given to the set of storage-related features first introduced in the Web Applications 1.0 specification, and now split off into its own W3C Web Storage specification. DOM Storage is designed to provide a larger, more secure, and easier-to-use alternative to storing information in cookies. It was first introduced with Firefox 2 and Safari 4.',
    link: 'https://developer.mozilla.org/docs/Web/Guide/API/DOM/Storage',
    source: ls
  },
  SessionStorage: {
    desc: 'DOM Storage is the name given to the set of storage-related features first introduced in the Web Applications 1.0 specification, and now split off into its own W3C Web Storage specification. DOM Storage is designed to provide a larger, more secure, and easier-to-use alternative to storing information in cookies. It was first introduced with Firefox 2 and Safari 4.',
    link: 'https://developer.mozilla.org/docs/Web/Guide/API/DOM/Storage',
    source: ss
  }
});

if (Quota) {
  Quota.open_file_system(1 * 1024 * 1024, function() {
    fs.getAll(); // Initial load here since this comes after requestFileSystem
    Quota.request_usage();
  });
}

app.controller('MainCtrl', function($scope, quota, storages) {
  $scope.quota = quota;
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

  $scope.time_start = function() {
    var now = getNow();
    $scope.start = now;
  };
  $scope.time_lap = function() {
    if ($scope.start !== 0) {
      var now = getNow();
      var duration = now - $scope.start;
      // silly hack but skip first one
      if ($scope.duration_log.length > 0) {
        console.log(duration / 1000, 'sec');
      }
      $scope.start = now;
      $scope.duration_log.push(duration);
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

  $scope.set_working_storage = function(name) {
    $scope.working_storage = $scope.storages[name].source;
  };

  $scope.change_file_system = function() {
    $scope.quota && $scope.quota.open_file_system(null, function() {
      $scope.request_usage();
    });
  };
  /*
    * how many times do I have to call this? only once?
    * will this work forever without asking more?
    * what happens if I change the requested size?
    * what if there's not enough storage available?
   */
  $scope.request_quota = function() {
    $scope.quota && $scope.quota.request_quota($scope.quota.disp_quota);
  };

  $scope.request_usage = function() {
    $scope.$emit('update');
    fs  && fs.getAll();
    idb && idb.getAll();
    sql && sql.getAll();
    ls  && ls.getAll();
    $scope.quota && $scope.quota.request_usage();
  };
  if (quota) quota.scope = $scope;
});

app.directive('storageTable', function() {
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
    controller: function($scope) {
      if ($scope.data.source) {
        $scope.data.source.onprogress = function(value, max) {
          $scope.time_lap();
          $scope.$emit('progress', value, max);
        };

        $scope.data.source.oncomplete = function() {
          $scope.time_finish();
          $scope.$emit('close_progress');
          if ($scope.quota) {
            $scope.quota.request_usage();
          }
        };
      }

      $scope.upload = function() {
        $scope.file_input.click();
      };

      $scope.open_fill_storage = function() {
        $scope.set_working_storage($scope.name);
        $scope.$emit('open_fill_storage');
      };

      $scope.delete_all = function() {
        if (confirm('Do you really want to delete all?')) {
          $scope.data.source.deleteAll();
        }
      };
    },
    link: function(scope, elem, attr) {
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

      if (scope.data === undefined || scope.data.source === undefined) return;
      scope.data.source.scope = scope;
      scope.hover = false;
      scope.total_size = '0.0MB';
      scope.file_input = elem.find('input')[0];

      // Why can't this be elem.find('input[type="file"]') ?
      scope.file_input.onchange = function(e) {
        Array.prototype.forEach.call(e.target.files, function(file) {
          scope.time_start();
          scope.data.source.add(file);
        });
      };

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
        if (scope.data.source.loading) return;
        // If directory is given
        var transfer = e.originalEvent.dataTransfer;
        if (transfer.items) {
          Array.prototype.forEach.call(transfer.items, function(item) {
            if (item) {
              var entry = item.webkitGetAsEntry();
              if (entry.isDirectory) {
                addMultiple(entry, scope.data.source.add.bind(scope.data.source));
              } else {
                scope.time_start();
                scope.data.source.add(entry);
              }
            }
          });
        // If multiple files are given
        } else {
          Array.prototype.forEach.call(transfer.files, function(file) {
            scope.data.source.add(file);
          });
        }
        scope.$emit('progress', 0, 10);
        scope.$apply();
      });
    }
  };
});

app.directive('fillStorage', function() {
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
        1024 * 1024 * 5 * 100,  // 500MB
        1024 * 1024 * 1024      // 5GB
      ];
      $scope.chunk_size = 1024 * 1024 * 5;
      $scope.quantity = 1;
      $scope.fill = function() {
        $scope.$emit('close_fill_storage');
        $scope.$emit('progress', 0, $scope.quantity);
        var size = $scope.chunk_size / 4; // chunk will be repetition of 4B
        var content = (new Array(size+1)).join('aあ');
        $scope.time_start();
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
              size:     chunk_size,
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
        scope.$apply();
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