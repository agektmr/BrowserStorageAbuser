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