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

