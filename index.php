<!DOCTYPE html>
<!--[if lt IE 7]>      <html class="no-js lt-ie9 lt-ie8 lt-ie7"> <![endif]-->
<!--[if IE 7]>         <html class="no-js lt-ie9 lt-ie8"> <![endif]-->
<!--[if IE 8]>         <html class="no-js lt-ie9"> <![endif]-->
<!--[if gt IE 8]><!--> <html class="no-js" ng-app="BrowserStorageAbuser"> <!--<![endif]-->
  <head>
    <meta charset="utf-8"/>
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1"/>
    <title>Browser Storage Abuser</title>
    <meta name="description" content=""/>
    <meta name="viewport" content="width=device-width, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
    <link rel="stylesheet" href="styles/united.css"/>
    <link rel="stylesheet" href="styles/main.css"/>
    <script type="text/ng-template" id="storage-table.html">
      <div class="panel panel-default" ng-class="{hover:hover, loading:source.loading, unsupported:!source.supported}">
        <div class="panel-heading row">
          <h2 class="panel-title col-sm-6 left">{{data.name}}</h2>
          <div class="col-sm-6 right">
            <span class="size" ng-class="{filled:source.filled}" title="{{source.total}}bytes">Items: {{source.table.length}}, Total: {{source.total|size}}</span>
          </div>
        </div>
        <div class="panel-body">
          <details>
            <summary>What is {{data.name}}?</summary>
            <ul>
              <li>{{data.desc}}</li>
              <li><a ng-href="{{data.link}}" target="_blank">Read more</a></li>
            </ul>
          </details>
          <div class="info right">
            <div class="btn-group btn-group right">
              <input type="file" multiple>
              <button class="btn btn-default" ng-click="upload()">Upload File</button>
              <button class="btn btn-warning" ng-click="open_fill_storage()">Fill Storage</button>
              <button class="btn btn-danger" ng-click="delete_all()">Delete All</button>
            </div>
          </div>
          <div class="table">
            <table class="table table-condensed" style="background-color:inherit;" ng-show="source.table.length>0">
              <thead>
                <tr class="row">
                  <th class="col-sm-8">Name</th>
                  <th class="col-sm-2">Size</th>
                  <th class="col-sm-2">Last Update</th>
                </tr>
              </thead>
              <tbody>
                <tr ng-repeat="item in source.table" class="row">
                  <td class="col-sm-8">{{item.name}}</td>
                  <td class="col-sm-2" title="{{item.size}}bytes">{{item.size|size}}</td>
                  <td class="col-sm-2">{{item.date|date:'yyyy/MM/dd HH:mm:ss'}}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </script>
    <script type="text/ng-template" id="storage-progress.html">
      <div id="progress" class="modal fade">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
              <h3>Progress</h3>
            </div>
            <div class="modal-body">
              <div class="progress progress-striped active">
                <div class="progress-bar" ng-style="{'width':value/max*100+'%'}"></div>
              </div>
            </div>
            <div class="modal-footer"></div>
          </div>
        </div>
      </div>
    </script>
    <script type="text/ng-template" id="fill-storage.html">
      <div id="modal" class="modal fade">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
              <h3>Fill Storage</h3>
            </div>
            <div class="modal-body form-horizontal row">
              <div class="control-group col-sm-4">
                <label class="control-label" for="chunk_size">Chunk Size:</label>
                <div class="controls">
                  <select class="form-control" ng-model="chunk_size" ng-options="(selection|size) for selection in chunk_selections" required>
                    <option id="chunk_size" ng-repeat="selection in chunk_selections" ng-value="selection">{{selection|size}}</option>
                  </select>
                </div>
              </div>
              <div class="control-group col-sm-4">
                <label class="control-label" for="quantity">Quantity:</label>
                <div class="controls">
                  <input type="number" id="quantity" class="form-control" ng-model="quantity" min="1" required>
                </div>
              </div>
              <div class="control-group col-sm-4">
                <label class="control-label">Total:</label>
                <div class="controls">
                  <span>{{chunk_size * quantity | size}}</span>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <input type="button" class="btn" data-dismiss="modal" value="Cancel"/>
              <input type="button" class="btn btn-primary" value="Fill" ng-click="fill()" />
            </div>
          </div>
        </div>
      </div>
    </script>
  </head>
  <body ng-controller="MainCtrl">

    <!--[if lt IE 7]>
      <p class="chromeframe">You are using an outdated browser. <a href="http://browsehappy.com/">Upgrade your browser today</a> or <a href="http://www.google.com/chromeframe/?redirect=true">install Google Chrome Frame</a> to better experience this site.</p>
    <![endif]-->
    
    <!--[if lt IE 9]>
      <script src="scripts/vendor/es5-shim.min.js"></script>
      <script src="scripts/vendor/json3.min.js"></script>
    <![endif]-->

    <header class="navbar navbar-inverse navbar-fixed-top">
      <div class="container">
        <span class="navbar-brand">Browser Storage Abuser</span>
        <button class="btn btn-primary navbar-btn pull-right" ng-click="update()">Reload</button>
      </div>
    </header>

    <!-- Add your site or application content here -->
    <div class="container quota">
      <div class="page-header">
        <br>
        <br>
        <p>Have you ever wondered what is the limit of your browser's storage? This tool is for you to abuse and experiment that!</p>
        <p>I've done a bit of research using this tool to summarize all modern browser's storage size. The result of the research is available on <a href="http://www.html5rocks.com/tutorials/offline/quota-research/">HTML5Rocks</a>.</p>
        <h2>How to use</h2>
        <ol>
          <li>Switch storage type under "Quota" between "Temporary" or "Persistent" if available (Chrome and Opera only).
            <ul>
              <li>Quota for "Temporary" is predefined depending on the remainig space of your disk.</li>
              <li>You can assign arbitrary quota for "Persistent". Press "Request Quota" button after putting requested size.</li>
            </ul>
          </li>
          <li>Choose from storage you wish to experiment with.</li>
          <li>Press "Fill Storage".</li>
          <li>Choose "Chunk Size" and "Quantity" and then press "Fill".</li>
        </ol>
        <p>If quota is over for that storage, alert will pop up. That is the upper limit of the storage.</p>
      </div>
      <div class="panel panel-default" ng-class="{unsupported: !source.supported}" quota-table>
        <div class="panel-heading row">
          <h2 class="panel-title col-sm-12">Quota</h2>
        </div>
        <div class="panel-body form-horizontal" ng-cloak>
          <details>
            <summary>What is Quota Management API?</summary>
            <ul>
              <li>Quota management API manages usage and availability of local storage resources, and defines a means by which a user agent may grant Web applications permission to use more local space, temporarily or persistently, via various storage APIs.</li>
              <li><a href="http://updates.html5rocks.com/2011/11/Quota-Management-API-Fast-Facts" target="_blank">Read more</a></li>
            </ul>
          </details>
          <div class="form-group info row">
            <div class="col-sm-6">
              <select class="form-control" ng-model="source.storage_type" ng-change="change_file_system()" ng-hide="!source.supported">
                <option value="TEMPORARY">Temporary</option>
                <option value="PERSISTENT">Persistent</option>
              </select>
            </div>
            <div class="col-sm-6 form-inline">
              <div class="progress">
                <div class="progress-bar progress-bar-info" ng-style="{width:source.usage/source.quota*100+'%'}"></div>
              </div>
              <span class="size" title="{{source.usage}}bytes">{{source.usage|size}}</span> / <span ng-hide="source.storage_type=='PERSISTENT'">{{source.quota|size}}</span><span ng-hide="source.storage_type!='PERSISTENT'"><input type="number" ng-model="source.disp_quota">MB</span>
              <button class="btn btn-xs btn-warning" ng-click="request_quota()" ng-hide="source.storage_type!='PERSISTENT'">Request Quota</button>
            </div>
          </div>
        </div>
      </div>
      <storage-table ng-repeat="data in storages"></storage-table>
      <fill-storage></fill-storage>
      <storage-progress></storage-progress>
      <footer>
        <hr>
        <p>This demo is developed by <a href="http://google.com/+agektmr" target="_blank">Eiji Kitamura</a>. Powered by <a href="http://angularjs.org/" target="_blank">AngularJS</a>.<br>Source code is available on <a href="https://github.com/agektmr/BrowserStorageAbuser" target="_blank">GitHub</a>.</p>
      </footer>
    </div>

    <script src="https://code.jquery.com/jquery-2.1.4.min.js" defer></script>
    <script src="https://code.angularjs.org/1.4.4/angular.min.js" defer></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-modal/2.2.6/js/bootstrap-modalmanager.min.js" defer></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-modal/2.2.6/js/bootstrap-modal.min.js" defer></script>
    <script src="js/BrowserStorageAbuser.js" defer></script>
  </body>
</html>