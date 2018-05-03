var app = angular.module('cluster', [ 'ngResource','commonApp']);
app.config([ '$locationProvider', function($locationProvider) {
	$locationProvider.html5Mode({
		enabled : true,
		requireBase : false
	});
} ]);
 var baseURL = getConfigValue('microservice.background.url')  + "/apis/v1/clusters";
//baseURL = "http://127.0.0.1:8080/api/v1/clusters";

$(function() {
	$('body').on('mouseenter', '.list', function() {
		$(this).find('.updateOrDelete').show();
		clusterId = $(this).attr('id');
		clusterStatus = $(this).attr('statusattr');
		if (clusterStatus != 0) {
			$(this).find('.updateCluster').attr('disabled', "true");
		}
		if (clusterStatus == 1) {
			$(this).find('.deleteCluster').attr('disabled', "true");
		}
		if (clusterStatus == 4) {
			$(this).find('.updateCluster').attr('disabled', "true");
			$(this).find('.deleteCluster').attr('disabled', "true");
		}
	})

	$('body').on('mouseleave', '.list', function() {
		$(this).find('.updateOrDelete').hide();
	})
});

//####################################################################################################################
app.controller('myCluster', function($scope, $http, $resource,commonService) {
	clusterREST = $resource('', {}, {
		getClusters : {
			method : "GET",
			url : baseURL + '?userId=:userId',
		},
		saveCluster : {
			method : "POST",
			url : baseURL
		},
		deleteCluster : {
			method : "DELETE",
			url : baseURL + "/:clusterId"
		},
		getClusterDetail : {
			method : 'GET',
			url : baseURL + '/:clusterId',
		},
		updateCluster : {
			method : 'PUT',
			url : baseURL,
		},
		validateClusterName : {
			method : 'GET',
			url : baseURL + '/:clusterName/validate',
		},
		getProjects : {
			method : 'GET',
			url : baseURL + '/projects',
		},
		getEnvs : {
        	method : 'GET',
        	url : baseURL + '/envs',
    	},
        getEnvsByProjectId : {
            method : 'GET',
            url : baseURL + '/projects/:projectId/envs',
        }
	});
	
//####################################################################################################################
	// var user = getLoginUser();
	$scope.clusterData = {};//集群数据
    $scope.projectData = {};//项目数据
    $scope.envData = {};//所有环境数据
    $scope.passEnvData = {};//pass环境数据
    $scope.projectData=commonService.getProjects();
    $scope.envData = commonService.getEnvs();
    $scope.passEnvData = commonService.paasEnvData;
    console.log('projectData:',$scope.projectData);
    console.log('envData:',$scope.envData);
    console.log('passEnvData:',$scope.passEnvData);
    //根据项目过滤
    $scope.projectSelect = function (p) {
        $scope.selectProjectName = p;
    }
    //根据环境过滤
    $scope.paasEnvSelect = function (p) {
        $scope.selectPaasEnv = p;
    }

    $scope.$watch('envData', function () {
        $scope.getClusters();
    }, true);

    // 获得集群列表
    $scope.data = [];
	$scope.getClusters = function() {
        var loading = layui.loading('请稍候...');
		clusterREST.getClusters({'userId':globalUser.userId},function(result) {
            layer.close(loading);
			if (result.code == 1000){
                $scope.data = result.data;
                console.log($scope.data);
                angular.forEach(result.data,function (item,index) {
                    item.envInfo = $scope.envData[item.paasEnvId];//获得pass环境信息
                    //item.envInfo = $scope.envData[item.envId];//获得iaas环境信息
                });
			} else {
                layer.msg(result.message, {icon: 2});
			}
		},function(error){
            layer.close(loading);
            errorHandler(error);
        });
	}
	//$scope.getClusters();

	//获得项目对应的环境信息
	$scope.projectIaasEnvData = {};
    $scope.projectPaasEnvData = {};
    $scope.getEnvsByProjectId = function(v){
        $scope.projectIaasEnvData = {};
        $scope.projectPaasEnvData = {};
        angular.forEach($scope.projectData, function(item, index){
            if (v == item) {
                clusterREST.getEnvsByProjectId({'projectId':index},function(result) {
                    angular.forEach(result.data, function(item, index){
                        if (item.envType == 0) {

                            $scope.projectIaasEnvData[item.id] = item.areaDTO.areaDTO.name + (item.areaDTO.areaDTO.name == null ? '' : '-'  )+
								item.areaDTO.name + "-" + item.name;
						} else if (item.envType == 1) {
                            $scope.projectPaasEnvData[item.id] = item.areaDTO.areaDTO.name + (item.areaDTO.areaDTO.name == null ? '' : '-'  )+
								item.areaDTO.name + "-" + item.name;
						}

                    });
                });
            }
        });
	}

	 // 创建集群
	var addClusterFlag = true;// 防重复提交标志
    $scope.createClusterWindow = function() {
    	$scope.clusterData={};
    	$scope.clusterData.isInstallNetworkTools = 1;
    	$scope.clusterData.isHA = 2;
        layer.open({
            type: 1,
            area: ['800px','600px'],
            content: $('#createCluster'),
            end: function(){ 
            	$('#createCluster').hide();
            } 
        });
        $('.layui-layer-title').text('创建集群');
    };
    $scope.creeateCluster = function () {
    	if(!addClusterFlag){
			  return;
		}
    	addClusterFlag = false;
    	clusterNameCheck($('.layui-input[name=clusterName]'));
		dnsCheck($('.layui-input[name=dns]'));
		descriptionCheck($('#description'));
		requiredCheck($('.layui-input[name=projectName]'));
        requiredCheck($('.layui-input[name=iaasName]'));
        requiredCheck($('.layui-input[name=paasName]'));
	  	if($('.check-result').length != 0){
	  		addClusterFlag = true;
	  		return false;
	  	}
	  	var paasEnvId;
    	angular.forEach($scope.projectData, function(item, index){
        	if ($scope.clusterData.projectName == item) {
        		$scope.clusterData.projectId = index;
        	}
        });
        angular.forEach($scope.projectPaasEnvData, function(item, index){
            if ($scope.clusterData.envPaasName == item) {
                paasEnvId = index;
            }
        });
        angular.forEach($scope.projectIaasEnvData, function(item, index){
            if ($scope.clusterData.envIaasName == item) {
                $scope.clusterData.envId = index;
            }
        });
        var loading = layui.loading('请稍候...');
    	clusterREST.validateClusterName({'clusterName':$scope.clusterData.clusterName,'envId':paasEnvId},function(result){
    		if (result.data == true) {
    			clusterREST.saveCluster({'envId':paasEnvId},$scope.clusterData,function(result) {
    	    		if (result.data == true) {
    	    			layer.msg('创建集群成功', {icon: 1});
    					closeLayer();
    					$scope.getClusters();
    	    		} else {
    	    			layer.msg(result.message, {icon: 2});
    	    		};
    	    		addClusterFlag = true;
                    layer.close(loading);
    			},function(error){
                    layer.close(loading);
                    errorHandler(error);
                });
    		}else{
                layer.close(loading);
    			addClusterFlag = true;
    			layer.msg("该集群名称已被占用", {icon: 2});
    		}
    	},function(error){
            layer.close(loading);
            errorHandler(error);
        });
    	
    	
    }
    
    // 删除集群
    $scope.deleteCluster = function(id,envId) {
    	layer.confirm('删除后不可恢复，确定要继续吗？',{
            btn: ['确定','取消']
        }, function(){
        	clusterREST.deleteCluster({"clusterId":id,'envId':envId},function(result){
    			layer.msg('删除成功', {icon: 1});
    			closeLayer();
    			$scope.getClusters();
    		},function(error){
    			layer.msg('删除失败', {icon: 2});
    		});
        });
    }
    
    //更新集群
    $scope.updateClusterWindow = function(clusterId,envId) {
    	clusterREST.getClusterDetail({'clusterId':clusterId,'envId':envId}, function(result) {
    		$scope.editCluster = result.data;
    		$scope.editCluster.paasEnvInfo = $scope.envData[$scope.editCluster.paasEnvId];
            $scope.editCluster.iaasEnvInfo = $scope.envData[$scope.editCluster.envId];
    	});
    	layui.render();
        layer.open({
            type: 1,
            area: ['800px','600px'],
            content: $('#editCluster-form'),
            end: function(){ 
            	$('#editCluster-form').hide();
            } 
        });
        $('.layui-layer-title').text('更新集群');
    }
    $scope.updateCluster = function() {
		requiredCheck($('#edit-projectName'));
		dnsCheck($('#edit-dns'));
		if($('.check-result').length != 0){
		  		return false;
		};
        var loading = layui.loading('请稍候...');
    	clusterREST.updateCluster({'envId':$scope.editCluster.paasEnvId},$scope.editCluster,function(result) {
    		if (result.data == true) {
    			layer.msg('更新集群成功', {icon: 1});
				closeLayer();
				$scope.getClusters();
    		} else {
                layer.close(loading);
    			layer.msg(result.message, {icon: 2});
    		};
		},function(error){
            layer.close(loading);
            errorHandler(error);
        });
    }

    $scope.enterDetail = function (v) {
        location.href = './detail.html?id=' + v.id + '&envId=' + v.paasEnvId + '&iaasEnvId=' + v.envId;
    }

});

// 检验
app.directive('commonValid', function() {
	return {
		require : "ngModel",
		link : function(scope, element, attr, ngModel) {
			ngModel.$parsers.push(function(value) {
				var reg = new RegExp("^[\u4e00-\u9fa5_A-Za-z0-9]+$");
				var validity = ngModel.$isEmpty(value) || reg.test(value);
				ngModel.$setValidity('commonValid', validity);
				return value;
			});
		}
	};
})

app.filter('textLengthSet', function() {
	return function(value, wordwise, max, tail) {
		if (!value)
			return '';

		max = parseInt(max, 10);
		if (!max)
			return value;
		if (value.length <= max)
			return value;

		value = value.substr(0, max);
		if (wordwise) {
			var lastspace = value.lastIndexOf(' ');
			if (lastspace != -1) {
				value = value.substr(0, lastspace);
			}
		}

		return value + (tail || ' …');
	};
});

$('body').on('keyup', '.layui-input[name=clusterName]', function() {
	clusterNameCheck($(this));
});

$('body').on('keyup', '.layui-input[name=dns]', function() {
	dnsCheck($(this));
});

$('body').on('keyup', '.layui-input[name=timeServer]', function() {
    timeServerCheck($(this));
});

$('body').on('keyup', '#edit-dns', function() {
	dnsCheck($(this));
});

$('body').on('keyup', '#edit-timeserver', function() {
    timeServerCheck($(this));
});

$('.layui-input[name=projectName],.layui-input[name=appProject]').change(
		function() {
			requiredCheck($(this))
		});

$('body').on('keyup', '#description', function() {
	descriptionCheck($(this));
});

function clusterNameCheck(_this) {
	var reg = /^[\u0391-\uFFE5a-zA-Z0-9_]+$/;
	if (_this.val().length == 0) {
		setError(_this, '集群名称不能为空');
		return false;
	}
	if (!reg.test(_this.val())) {
		setError(_this, '只能包含中文，英文，数字，下划线');
		return false;
	}
	if (_this.val().length > 50) {
		setError(_this, '输入内容长度不能超过50');
		return false;
	}
	setSuccess(_this);
}

function dnsCheck(_this) {
    if (_this.val().length == 0) {
        setError(_this, 'DNS不能为空');
        return false;
    }
	var ipsStr = "(((1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|[1-9])\\.(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|\\d)\\.(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|\\d)\\.(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|\\d)),?)*";
	var ips_reg = new RegExp("^" + ipsStr + "$");
	if (_this.val().length > 0) {
		if (!ips_reg.test(_this.val())) {
			var info = '输入有误，格式：11.11.11.11,22.22.22.22(多个IP用逗号分隔)';
			setError(_this, info);
			return false;
		}
		if (_this.val().length > 50) {
			setError(_this, '输入内容长度不能超过50');
			return false;
		}
	}
	setSuccess(_this);
}

function timeServerCheck(_this) {
    if (_this.val().length == 0) {
        setError(_this, 'DNS不能为空');
        return false;
    }

    var ips_reg = new RegExp("^(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|[0-9])\\.(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|\\d)\\.(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|\\d)\\.(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|\\d)$");

    // var ipsStr = "(((1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|[1-9])\\.(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|\\d)\\.(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|\\d)\\.(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|\\d)),?)*";
   // var ips_reg = new RegExp("^" + ipsStr + "$");
    if (_this.val().length > 0) {
        if (!ips_reg.test(_this.val())) {
            var info = '请输入正确的IP地址';
            setError(_this, info);
            return false;
        }
    }
    setSuccess(_this);
}

function requiredCheck(_this) {
	if (_this.val() == '') {
		setError(_this, '不能为空');
	} else {
		setSuccess(_this);
	}
}

function descriptionCheck(_this) {
	if (_this.val().length > 512) {
		setError(_this, '输入内容长度不能超过512');
		return false;
	}
	setSuccess(_this);
}
