var app = angular.module('appList', ['ngResource']);
var URL = getConfigValue('microservice.app.url');
 app.config([ '$locationProvider', function($locationProvider) {
     $locationProvider.html5Mode({
           enabled: true,
           requireBase: false
         });
 }]);

var scope = null;
app.controller('myAppList', function($scope,$http,$location,$resource){
	var clusterId = $location.search().clusterId;
	
    scope = $scope;
    $scope.apps = {};
    $scope.containers = [];
    $scope.params = {'pageNo':1,'pageSize':8,'clusterId':clusterId};



    // 封装REST API -----------------------------------------START---------------------------------------------
    AppREST = $resource('', {}, {

        queryApp: {
            method: 'POST',
            isArray: false,
            url: URL + '/app/list'
        },
        deleteApp: {
            method: 'DELETE',
            isArray: false,
            url: URL + '/app/:appId',
            params: {'appId':'@appId'}
        },
        startApp: {
            method: 'GET',
            isArray: false,
            url: URL + '/app/start/:appId',
            params: {'appId':'@appId'}
        },
        stopApp: {
            method: 'GET',
            isArray: false,
            url: URL + '/app/stop/:appId',
            params: {'appId':'@appId'}
        },
        stopContainer: {
        	method: 'GET',
            isArray: false,
            url: URL + '/container/stop/:containerId',
            params: {'containerId':'@containerId'}
        },
        deleteContainer: {
        	method: 'DELETE',
            isArray: false,
            url: URL + '/container/:containerId',
            params: {'containerId':'@containerId'}
        },
        startContainer: {
        	method: 'GET',
            isArray: false,
            url: URL + '/container/start/:containerId?userId=:userId',
            params: {'containerId':'@containerId','userId':'@userId'}
        },
        queryContainerList: {
        	method: 'GET',
            isArray: true,
            url: URL + '/container?appId=:appId',
            params: {'appId':'@appId'}
        },
        scaleContainer: {
        	method: 'GET',
        	isArray: false,
        	url: URL + '/container/scale/:containerId?flag=:flag',
        	params: {"containerId":"@containerId","flag":"@flag"}
        }
        



    });
    // 封装REST API -----------------------------------------END---------------------------------------------

    $scope.goToAppEdit = function(_item,_containerId){
    	window.location = "ContainerEdit.html?appId="+_item.id+"&containerId="+_containerId;
    }
    
    $scope.goToAppCreate = function(){
    	window.location = "AppCreate.html";
    }
    
    $scope.queryApp = function(){
        $scope.params.createrId = user.userId;
        AppREST.queryApp($scope.params,function(result){
            $scope.apps = result.list;
            
            if ((result.count % $scope.params.pageSize)==0) {
                $scope.params.pageNum = Math.floor(result.count/$scope.params.pageSize);
            }else{
                $scope.params.pageNum = Math.floor(result.count/$scope.params.pageSize)+1;
            }
         // 分页
	        layui.use(['laypage'], function(){
	            var laypage = layui.laypage;
	            laypage({
	                cont: 'page', 
	                curr: $scope.params.pageNo,
	                pages: $scope.params.pageNum,   
	                skip: true,
	                jump: function(obj, first){
	                    if(!first){
	                    	$scope.params.pageNo = obj.curr;	
	                    	$scope.queryApp();
	                    }
	                }
	            });
	        });
            
        },function(error){
//            layer.msg('查询失败', {icon: 2});
        });
    }

    //  下一页-无用
    $scope.next = function(){
        if($scope.params.pageNo<$scope.params.pageNum){
            $scope.params.pageNo++;
            $scope.queryApp();
        }
    }
    
    // 上一页-无用
    $scope.previous = function(){
        if ($scope.params.pageNo>1) {
            $scope.params.pageNo--;
            $scope.queryApp();
        }
    }

    // 查询
    $scope.keyWordQuery = function(e){
        var keycode = window.event?e.keyCode:e.which;
        if(keycode == 13){
            $scope.queryApp();
        }
    }

    //启动应用
    $scope.startApp = function(index,id){
    	var _load = layui.loading('应用启动中...');
        AppREST.startApp({'appId':id},function(data){
        	layer.close(_load);
            layer.msg('启动成功',{icon: 1});
            $scope.queryApp();
        },function(error){
        	layer.close(_load);
            layer.msg('启动出错',{icon: 2});
        })
    }
    
    //启动容器
    $scope.startContainer = function(index,event,item,id){
    	var _load = layui.loading('容器启动中...');
        AppREST.startContainer({'containerId':id,'userId':user.userId},function(data){
        	layer.close(_load);
        	layer.msg('启动成功',{icon: 1});
            $scope.queryContainer(item);
        },function(error){
        	layer.close(_load);
            layer.msg('启动出错',{icon: 2});
        })
    }

    //停止应用
    $scope.stopApp = function(index,id){
        layui.use('layer', function(){
            layer = layui.layer;
            layer.confirm('确定要停止应用吗？',{
                btn: ['确定','取消']
            }, function(index){
            	var _load = layui.loading('应用停止中...');
                AppREST.stopApp({'appId':id},function(data){
                	layer.close(_load);
                    layer.msg('停止成功',{icon: 1});
                    $scope.queryApp();
                },function(error){
                	layer.close(_load);
                    layer.msg('停止出错',{icon: 2});
                })
            });
        });
    }
    
    //停止容器
    $scope.stopContainer = function(index,event,item,id){
    	layui.use('layer', function(){
            layer = layui.layer;
            layer.confirm('确定要停止容器吗？',{
                btn: ['确定','取消']
            }, function(index){
            	var _load = layui.loading('容器停止中...');
                AppREST.stopContainer({'containerId':id},function(data){
                	layer.close(_load);
                	layer.msg('停止成功',{icon: 1});
                	$scope.queryContainer(item);
                },function(error){
                	layer.close(_load);
                    layer.msg('停止出错',{icon: 2});
                })
            });
        });
    }

    //删除应用
    $scope.deleteApp = function(index,id){
        layui.use('layer', function(){
            layer = layui.layer;
            layer.confirm('确定要删除应用吗？',{
                btn: ['确定','取消']
            }, function(index){
            	var _load = layui.loading('应用删除中...');
                AppREST.deleteApp({'appId':id},function(result){
                	layer.close(_load);
                    layer.msg("删除成功",{icon:1});
                    $scope.queryApp();
                },function(error){
                	layer.close(_load);
                    layer.msg('删除出错',{icon: 2});
                });
            });
        });
    }
    
    // 删除容器
    $scope.deleteContainer = function(index,event,item,id){
        layui.use('layer', function(){
            layer = layui.layer;
            layer.confirm('确定要删除容器吗？',{
                btn: ['确定','取消']
            }, function(index){
            	var _load = layui.loading('容器删除中...');
                AppREST.deleteContainer({'containerId':id},function(result){
                	layer.close(_load);
                    layer.msg("删除成功",{icon:1});
                    $scope.queryContainer(item);
                },function(error){
                	layer.close(_load);
                    layer.msg('删除出错',{icon: 2});
                });
            });
        });
    }
    
    // 扩容 | 缩容
    $scope.scaleContainer = function(index,event,item,id,flag){
    	if (flag) {
			// 扩容
    		layui.use('layer', function(){
	            layer = layui.layer;
	            layer.confirm('确定要扩容吗？',{
	                btn: ['确定','取消']
	            }, function(index){
	            	var load = layui.loading('请稍后，数据处理中...');
	                AppREST.scaleContainer({'containerId':id,'flag':true},function(result){
	                	layer.close(load);
	                	layer.msg("扩容成功",{icon:1});
	                    $scope.queryContainer(item);
	                    layer.close(index);
	                },function(error){
	                	layer.close(load);
	                    layer.msg('扩容失败',{icon: 2});
	                });
	            });
	        });
		} else {
			//缩容
			layui.use('layer', function(){
	            layer = layui.layer;
	            layer.confirm('确定要缩容吗？',{
	                btn: ['确定','取消']
	            }, function(index){
	            	var load = layui.loading('请稍后，数据处理中...');
	                AppREST.scaleContainer({'containerId':id,'flag':false},function(result){
	                	layer.close(load);
	                	layer.msg("缩容成功",{icon:1});
	                    $scope.queryContainer(item);
	                    layer.close(index);
	                },function(error){
	                	layer.close(load);
	                	layer.msg('缩容失败',{icon: 2});
	                });
	            });
	        });
		}
    }
    
    
    //  查询服务列表
    $scope.queryContainer = function(item,target){
   	 AppREST.queryContainerList({'appId':item.id},function(data){
   		 var isExistsStop = 0;
         var isExistStart = 0;
        
   		 $.each(data,function(index,val){
   			 val.runningPodCount = 0;
   			 var isExistsError = false;
   			 var isExistsNotRunning = false;
             
   			 //判断启动和停止按钮是否显示
   			 if (isExistStart!=1 && (val.status==null || ""==val.status)) {
   				isExistStart = 1;
			 }
   			 
   			 if (isExistsStop!=1 && (val.status!=null && 1==val.status)) {
   				isExistsStop = 1;
			 }
   			 
   			 if(val.status!=1){//被停止的无需判断
   				 if(val.pods !=undefined && val.pods !=null && val.pods.length > 0){
           			 $.each(val.pods,function(_index,_val){
           				 if(_val.status == "Running"){
           					 val.runningPodCount ++;
           				 }
           				 if(!isExistsError && _val.status != "Terminating" && _val.status != "ContainerCreating"&& _val.status != "Running"&& _val.status != "Pending"){
           					 isExistsError = true;
           					 val.status = 4;//存在异常
           				 }
           				 
           				 if(!isExistsError && !isExistsNotRunning && (_val.status == "Terminating" || _val.status == "ContainerCreating"|| _val.status == "Pending")){
           					 val.isExistsNotRunning = true;
           					 val.status = 3;//存在非运行
           				 }
           			 });
           		 }else{
           			 val.status = 5;
           		 }
       			 
       			 if(val.runningPodCount!=0 && val.runningPodCount==val.podCount){
       				 val.status = 2;//运行中
       			 }
   			 }
   			 
   			 if(val.maxCpu%1000==0){
   				 val.maxCpu = val.maxCpu/1000;
   			 }else{
   				 val.maxCpu = (parseFloat(val.maxCpu)/1000).toFixed(3);
   			 }
   			 
   			 if( val.maxMemory%1024==0){
   				 val.maxMemory =val.maxMemory/1024;
   			 }else{
   				 val.maxMemory = (parseFloat(val.maxMemory)/1024).toFixed(3);
   			 }
   			 
   		 });
   		 
   		 item.containers = data;
   		 item.containerNum = data.length;
   		 item.existsStop = isExistsStop;
   		 item.existStart = isExistStart;
   		 if(target){
   			$(target).html("<i class='iconfont'>&#xe62b;</i>");
   			$(target).attr("disabled","false");
   			$(target).attr("title","刷新");
   		 }
   	 },function(error){
   		if(target){
   			$(target).html("<i class='iconfont'>&#xe62b;</i>");
   			$(target).attr("disabled","false");
   			$(target).attr("title","刷新");
   		 }
   		 layer.msg('查询容器信息出错',{icon: 2});
   	 });
    }
    
    $scope.refreshContainer = function(_item,event){
    	$(event.target).attr("disabled","disabled");
    	$(event.target).attr("title","刷新中");
    	$(event.target).html("<i class='layui-icon'>&#xe63d;</i>");
    	$scope.queryContainer(_item,event.target);
    }

    // 打开容器详情列表
     $scope.detailToggle = function(index,event,item){
         if(true){
        	 $scope.queryContainer(item)
             tableDetailToggle(index,event);
         }else{
         }
     };
     
     // 打开容器地址列表
     $scope.containerToggle = function(event,item){
         if(item.pods!=null && item.pods.length >0){
             $scope.containers = item.pods;
             alertDetail(event);
         }else{
        	 $scope.containers = [];
         };
    };

    // 弹出页面
    $scope.openWindown = function(_url,_title,_width,_height){
        if(!_title){
            _title= '信息';
        }
        layer.open({
            type: 2,
            title: _title,
            content: _url,
            //btn: ['确定','取消'],
            area: [_width,_height],
            // btn1: function(index){
            //     layer.msg('你点击了确定');
            //     layer.close(index);
            // },
            // btn2: function(){
            //     layer.msg('你点击了取消');
            // },
            end: function(){
                //$('#alertPage').hide();
                //window.location.reload();
            }
        });

    }
    
    // 弹出显示成功，子页面调用
    $scope.openSuccessNote = function(_content){
		layer.msg(_content, {icon: 1});
    }
    
    var user = getLoginUser();
    $scope.queryApp();
    
    
});

