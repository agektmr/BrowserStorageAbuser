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

// app.directive('quota', function($window, storages) {
//   var temporaryStorage =  $window.navigator.temporaryStorage ||
//                           $window.navigator.webkitTemporaryStorage ||
//                           $window.navigator.mozTemporaryStorage ||
//                           $window.navigator.msTemporaryStorage ||
//                           undefined;
//   var persistentStorage = $window.navigator.persistentStorage ||
//                           $window.navigator.webkitPersistentStorage ||
//                           $window.navigator.mozPersistentStorage ||
//                           $window.navigator.msPersistentStorage ||
//                           undefined;

//   var getNow = function() {
//     return window.performance && performance.now ?
//            (performance.now() + performance.timing.navigationStart) :
//            Date.now();
//   };

//   return {
//     restrict: 'C',
//     controller: function($scope) {
//       $scope.quota_supported = false;
//       $scope.usage = 0;
//       $scope.quota = 0;
//       $scope.disp_quota = 0;
//       $scope.storage = temporaryStorage || null;
//       $scope.storage_type = 'TEMPORARY';
//       $scope.storages = storages;
//       $scope.start = 0;
//       $scope.duration_log = [];


//       $scope.error_callback = function(e) {
//         console.error('Error', e);
//         console.trace();
//       };

//       $scope.time_start = function() {
//         var now = getNow();
//         $scope.start = now;
//       };
//       $scope.time_lap = function() {
//         if ($scope.start !== 0) {
//           var now = getNow();
//           var duration = now - $scope.start;
//           // silly hack but skip first one
//           if ($scope.duration_log.length > 0) {
//             console.log(duration / 1000, 'sec');
//           }
//           $scope.start = now;
//           $scope.duration_log.push(duration);
//         }
//       };
//       $scope.time_finish = function() {
//         if ($scope.start !== 0) {
//           var now = getNow()
//           var duration = now - $scope.start;
//           console.log(duration / 1000, 'sec');
//           $scope.duration_log.push(duration);

//           var total = 0,
//               i = 1; // starts from 1 for same silly reason
//           while ($scope.duration_log[i] !== undefined) {
//             total += $scope.duration_log[i++];
//           };
//           console.log('average:', total/$scope.duration_log.length/1000, 'sec');

//           $scope.start = 0;
//           $scope.duration_log = [];
//         }
//       };

//       $scope.change_storage_type = function() {
//         $scope.storage = $scope.storage_type === 'TEMPORARY' ? temporaryStorage : persistentStorage;
//       };

//       $scope.set_working_storage = function(name) {
//         $scope.working_storage = $scope.storages[name].source;
//       };

//       $scope.request_quota = function() {
//         $scope.storage.requestQuota($scope.disp_quota * 1024 * 1024, function(quota) {
//           $scope.quota = quota;
//           $scope.disp_quota = ~~(quota / 1024 / 1024);
//           // $scope.open_file_system();
//         }, $scope.error_callback);
//       };
//       $scope.request_usage = function() {
//         $scope.$emit('update');
//         $scope.storage.queryUsageAndQuota(function(usage, quota) {
//           $scope.quota = quota;
//           $scope.usage = usage;
//           $scope.disp_quota = ~~(quota / 1024 / 1024);
//           $scope.$apply();
//         }, $scope.error_callback);
//       };
//     },
//     link: function(scope, elem, attr) {
//       if (!temporaryStorage || !persistentStorage) {
//         throw 'Quota Management API not supported on this browser';
//       }
//       // scope.open_file_system();
//     }
//   }
// });

var Quota = (function(global) {
  var requestFileSystem = global.requestFileSystem ||
                          global.webkitRequestFileSystem ||
                          global.mozRequestFileSystem ||
                          global.msRequestFileSystem ||
                          undefined;
  var temporaryStorage =  global.navigator.temporaryStorage ||
                          global.navigator.webkitTemporaryStorage ||
                          global.navigator.mozTemporaryStorage ||
                          global.navigator.msTemporaryStorage ||
                          undefined;
  var persistentStorage = global.navigator.persistentStorage ||
                          global.navigator.webkitPersistentStorage ||
                          global.navigator.mozPersistentStorage ||
                          global.navigator.msPersistentStorage ||
                          undefined;

  var error = function(e) {
    alert('Error!', e);
    console.error('Quota Management Error', e);
    console.trace();
  };

  var Quota = function() {
    if (!requestFileSystem) {
      throw 'File System API not supported on this browser';
    }
    if (!temporaryStorage || !persistentStorage) {
      throw 'Quota Management API not supported on this browser';
    }
  };
  Quota.prototype = {
    fs: null,
    supported: false,
    usage: 0,
    quota: 0,
    type:  'TEMPORARY',
    scope: null,
    open_file_system: function(length, callback) {
      var storage = this.type === 'TEMPORARY' ? temporaryStorage : persistentStorage;
      length = length || this.quota;
      requestFileSystem(global[this.type], length, (function(fs) {
        this.supported = true;
        this.fs = fs;
        if (typeof callback === 'function') callback();
      }).bind(this), error);
    },
    request_quota: function(length_mb) {
      var storage = this.type === 'TEMPORARY' ? temporaryStorage : persistentStorage;
      storage.requestQuota(length_mb * 1024 * 1024, (function(quota) {
        this.quota = quota;
        this.disp_quota = ~~(quota / 1024 / 1024);
        this.open_file_system(quota);
      }).bind(this), error);
    },
    request_usage: function() {
      var storage = this.type === 'TEMPORARY' ? temporaryStorage : persistentStorage;
      storage.queryUsageAndQuota((function(usage, quota) {
        this.quota = quota;
        this.usage = usage;
        this.disp_quota = ~~(quota / 1024 / 1024);
        this.disp_usage = ~~(usage / 1024 / 1024);
      }).bind(this), error);
    }
  };
  return new Quota();
})(this);