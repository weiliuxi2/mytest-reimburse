var app = angular.module('clusterDetail', ['ngResource', 'commonApp']);
var baseURL = getConfigValue('microservice.background.url') + "/apis/v1/clusters";
var countURL = '/container/count/resource/';
//var baseURL = 'http://127.0.0.1:8082/clusters';
//该集群下主机名
var global_clusterStatus;
var serverNames = [];
var clusterDetailREST;
var scope;
var http;
var monitorInitFlag = false;
var cpuChart;
var memChart;
var diskChart2;
var clusterId;
var envId;

//参数传入
app.config(['$locationProvider', function ($locationProvider) {
    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });
}]);


//#####################################################################################
app.controller('myClusterDetail', function ($scope, $http, $resource, $timeout, commonService, $location) {
    scope = $scope;
    http = $http;
    clusterId = $location.search().id;
    envId = $location.search().envId;
    var iaasEnvId = $location.search().iaasEnvId;
    //restful api
    clusterDetailREST = $resource('', {}, {
        getClusterDetail: {
            method: 'GET',
            url: baseURL + '/:clusterId',
        },
        updateFloadIp: {
            method: "GET",
            url: baseURL + '/:clusterId/floadips',
        },
        getCloudHost: {
            method: "GET",
            url: baseURL + '/projects/:projectId/envs/:iaasEnvId/cloud-hosts',
        },
        getServers: {
            method: "GET",
            url: baseURL + '/:clusterId/servers',
        },
        addClusterServer: {
            method: "POST",
            url: baseURL + '/:clusterId/servers',
        },
        updateClusterServer: {
            method: "PUT",
            url: baseURL + '/:clusterId/servers',
        },
        deleteClusterServers: {
            method: "DELETE",
            url: baseURL + '/:clusterId/servers',
        },
        validateClusterServerName: {
            method: "GET",
            url: baseURL + '/:clusterId/servers/:serverName/validate',
        },

        joinCluster: {
            method: "GET",
            url: baseURL + '/:clusterId/join' + '?userId=:userId&ids=:ids&envId=:envId',
        },
        deployCluster: {
            method: "GET",
            url: baseURL + '/:clusterId/deploy' + '?userId=:userId&envId=:envId',
        },


        getServiceAndPodCount: {
            method: "GET",
            url: countURL + ':clusterId',
        },


        saveClusterStorage: {
            method: "POST",
            url: baseURL + '/:clusterId/storages',
        },
        getClusterStorage: {
            method: "GET",
            url: baseURL + '/:clusterId/storages',
        },
        addServerLabel: {
            method: "POST",
            url: baseURL + '/:clusterId/servers/:serverName/labels',
        },
        deleteServerLabel: {
            method: "DELETE",
            url: baseURL + "/:clusterId/servers/:serverName/labels/:labelKey",
        },
        updateServerLabel: {
            method: "PUT",
            url: baseURL + '/:clusterId/servers/:serverName/labels',
        },
        getServerLabels: {
            method: "GET",
            url: baseURL + "/:clusterId/servers/:serverName/labels",
        },
        validateLabelName: {
            method: "GET",
            url: baseURL + "/:clusterId/servers/:serverName/labels/:labelKey/validate",
        }
    });
//#######################################################################	
    $('#host').siblings().hide();

    $scope.projectData = commonService.getProjects();
    $scope.envData = commonService.getEnvs();
    $scope.clusterData = {};
    $scope.$watch('envData', function () {
        $scope.clusterData.paasEnvInfo = $scope.envData[envId];
        $scope.clusterData.iaasEnvInfo = $scope.envData[iaasEnvId];
    }, true);

    //获得集群，服务/pod数
    var getServiceAndPodCount = function () {
        clusterDetailREST.getServiceAndPodCount({
            clusterId: clusterId
        }, function (result) {
            $scope.serviceTotal = result.service;
            $scope.podTotal = result.container;
        }, function (error) {
            $scope.serviceTotal = 0;
            $scope.podTotal = 0;
        });
    }

    //获得该项目下所有云主机
    $scope.getCloudHost = function () {
        clusterDetailREST.getCloudHost({
            'projectId': $scope.clusterData.projectId,
            'iaasEnvId': $scope.clusterData.envId
        }, function (result) {
            $scope.cloudHosts = result.data;
            console.log(result.data);
        });
    }

    //获得集群主机
    $scope.getServerList = function (flag) {
        $scope.selectedAll = false;
        clusterDetailREST.getServers({'clusterId': clusterId, 'envId': envId}, function (result) {
            $scope.serverList = result.data;
            $scope.serverTotal = result.data.length;
            serverNames = [];
            var masterNum = 0;
            var existNodeFlag = false;
            var joinClusterNodes = [];

            for (var i = 0; i < result.data.length; i++) {
                var item = result.data[i];
                if (2 == item.status) {
                    serverNames.push(item.serverName);
                }
                if (2 == item.status && item.serverType == 2) {
                    joinClusterNodes.push(item);
                }
                if (item.serverType == 1) {
                    masterNum = masterNum + 1;
                }
                if (item.serverType == 2) {
                    existNodeFlag = true;
                }
            }

            if ($scope.clusterData.isHA != 1 && masterNum == 1 && existNodeFlag && $scope.clusterStatus == 0) {
                $("#deployButton").removeAttr("disabled");
            }
            else if ($scope.clusterData.isHA == 1 && masterNum >= 3 && existNodeFlag && $scope.clusterStatus == 0) {
                $("#deployButton").removeAttr("disabled");
            }
            else {
                $("#deployButton").attr('disabled', "true");
            }

            if (flag != 1) {
                if ($scope.clusterStatus == 2 || $scope.clusterStatus == 5) {
                    computeResource(joinClusterNodes);
                } else {
                    $scope.clusterMemRemainder = 0;
                    $scope.clusterMemTotal = 0;
                    $scope.clusterCpuRemainder = 0;
                    $scope.clusterCpuTotal = 0;
                    $scope.cpuPercent = 0 + "%";
                    $scope.memPercent = 0 + "%";
                }
            }
        });
    }

    //计算cpu,内存总资源
    var computeResource = function (serverList) {
        var cpuTotalTem = 0;
        var memTotalTem = 0;
        var cpuRemainderlTem = 0;
        var memRemainderTem = 0;

        var monitorCpuData;
        var monitorMemData;
        var paraCpu = "serverNames=" + serverNames + "&envId=" + envId + "&time=" + "1m";
        var paraMem = "serverNames=" + serverNames + "&envId=" + envId + "&time=" + "1m";

        $.ajax({
            url: baseURL + "/" + clusterId + "/monitors/cpu?" + paraMem,
            type: 'GET',
            async: false,
            success: function (data) {
                monitorCpuData = data.data;
            },
        });
        $.ajax({
            url: baseURL + "/" + clusterId + "/monitors/memory?" + paraMem,
            type: 'GET',
            async: false,
            success: function (data) {
                monitorMemData = data.data;
            },
        });

        if (typeof(monitorMemData) != "undefined" && typeof(monitorCpuData) != "undefined") {
            for (var i = 0; i < serverList.length; i++) {
                var item = serverList[i];
                if (item.cpu != null) {
                    cpuRemainderlTem = cpuRemainderlTem + (parseInt(item.cpu) - parseInt(item.cpu) * monitorCpuData[i][0].value / 100);
                    cpuTotalTem = cpuTotalTem + parseInt(item.cpu);
                }
                if (item.memory != null) {
                    memRemainderTem = memRemainderTem + (parseInt(item.memory) - parseInt(item.memory) * monitorMemData[i][0].value / 100);
                    memTotalTem = memTotalTem + parseInt(item.memory);
                }
            }
        }
        $scope.clusterMemRemainder = memRemainderTem.toFixed(2);
        $scope.clusterMemTotal = memTotalTem;
        $scope.clusterCpuRemainder = cpuRemainderlTem.toFixed(2);
        $scope.clusterCpuTotal = cpuTotalTem;
        if (cpuTotalTem != 0) {
            $scope.cpuPercent = parseInt(((cpuTotalTem - cpuRemainderlTem) / cpuTotalTem) * 100) + "%";
        } else {
            $scope.cpuPercent = 0 + "%";
        }
        if (memTotalTem != 0) {
            $scope.memPercent = parseInt(((memTotalTem - memRemainderTem) / memTotalTem) * 100) + "%";
        } else {
            $scope.memPercent = 0 + "%";
        }
    };

    //获得集群详细信息
    $scope.clusterStatus;
    $scope.getCluster = function () {
        var loading = layui.loading('请稍候...');
        clusterDetailREST.getClusterDetail({'clusterId': clusterId, 'envId': envId}, function (result) {
            $scope.clusterData = result.data;
            console.log("ccccc", $scope.clusterData);

            $scope.clusterStatus = result.data.status;
            global_clusterStatus = result.data.status;
            if ($scope.clusterStatus == 2) {
                getServiceAndPodCount();
            } else {
                $scope.serviceTotal = 0;
                $scope.podTotal = 0;
            }
            $scope.getCloudHost();
            if ($scope.clusterStatus == 0 || $scope.clusterStatus == 1) {
                initMonitoryBtn();
            }
            if ($scope.clusterData.isHA == 1) {
                $("#floadIpbutton").show();
                $("#floadip-show").show();
            }
            if ($scope.clusterStatus != 0) {
                $("#floadIpbutton").attr('disabled', "true");
            }
            if ($scope.clusterStatus == 6 || $scope.clusterStatus == 4) {
                $("#addButton").attr('disabled', "true");
            }
            $scope.getServerList();
            layer.close(loading);
        });
    };
    $scope.getCluster();

    //更新浮动IP后，重新查询集群信息
    var getClusterDetailForFloadIp = function () {
        clusterDetailREST.getClusterDetail({'clusterId': clusterId, 'envId': envId}, function (result) {
            $scope.clusterData = result.data;
        });
    }


    //监控事件
    $scope.monitor = function (event, date) {
        $(event.target).addClass('bgMonitorSelect').siblings('button').removeClass(
            'bgMonitorSelect');
        getCpu($scope, $http, date);
        getMem($scope, $http, date);
        getDisk($scope, $http, date);
    }

    //添加主机
    $scope.server = {};
    var addHostFlag = true;//防重复提交标志
    $scope.addHost = function () {
        $scope.server = {};
        addHostFlag = true;
        layer.open({
            type: 1,
            title: '添加主机',
            area: ['600px', '350px'],
            content: $('#addHost'),
            btnAlign: 'c',
            btn: ['确定', '取消'],
            yes: function (index) {
                $scope.addServer();
            }, end: function () {
                $('#addHost').hide();
            }
        });
    }
    $scope.addServer = function () {
        if (!addHostFlag) {
            return;
        }
        addHostFlag = false;
        if (!serverNameCheck($('#serverName')) || !requiredCheck($('#serverIP'), '主机IP不能为空') || !requiredCheck($('#serverType'), '主机类型不能为空')) {
            addHostFlag = true;
            return false;
        }
        if ($scope.clusterData.isHA != 1) {
            for (var i = 0; i < $scope.serverList.length; i++) {
                if ($scope.server.serverType == 1 && serverType == $scope.serverList[i].serverType) {
                    layer.msg('非高可用集群仅支持一个master节点', {icon: 2});
                    addHostFlag = true;
                    return;
                }
            }
        }
        //获得云主机ID
        angular.forEach($scope.cloudHosts, function (item, index) {
            if ($scope.server.serverIP == item.ip) {
                $scope.server.cloudHostId = item.id;
                $scope.server.cpu = item.vcpus;
                $scope.server.memory = item.ram;
                $scope.server.disk = item.disk;
                $scope.server.loginName = item.loginUser;
                $scope.server.loginPassWord = item.loginPassword;
                $scope.server.loginPort = item.port;
            }
        });
        clusterDetailREST.validateClusterServerName({
            'clusterId': clusterId,
            'serverName': $scope.server.serverName,
            'envId': envId
        }, function (result) {
            if (result.data == true) {
                $scope.server.clusterId = clusterId;
                clusterDetailREST.addClusterServer({
                    'clusterId': clusterId,
                    'envId': envId
                }, $scope.server, function (result) {
                    if (result.data == true) {
                        layer.msg('添加成功');
                        layer.closeAll();
                        $scope.getServerList();
                        $scope.getCloudHost();
                    } else {
                        layer.msg('添加异常，请重试', {icon: 2});
                    }
                    addHostFlag = true;
                });
            } else {
                addHostFlag = true;
                layer.msg('主机名已被占用', {icon: 2});
            }
        });
    }

    //删除主机事件
    $scope.delHost = function (e) {
        var clusterServerIds = [];
        var cloudHostIds = [];
        var exitFlag = false;
        angular.forEach($scope.serverList, function (item, index) {
            if (item.selected) {
                clusterServerIds.push(item.id);
                cloudHostIds.push(item.cloudHostId);
            }
        });

        layui.use('layer', function () {

            var layer = layui.layer;
            layer.open({
                type: 1,
                area: ['300px', '150px'],
                content: "确定删除主机吗",
                btn: ['确定', '取消'],
                yes: function (index) {
                    layer.close(index);
                    var index2 = layer.load(0, {shade: [0.4, '#888']});
                    clusterDetailREST.deleteClusterServers({
                        'clusterId': clusterId,
                        'clusterServerIds': clusterServerIds,
                        'cloudHostIds': cloudHostIds,
                        'envId': envId
                    }, function (result) {
                        if (result.data == true) {
                            layer.msg('删除成功', {icon: 1});
                            $("#updatebutton").attr('disabled', "true");
                            $("#delbutton").attr('disabled', "true");
                            $("#joinbutton").attr('disabled', "true");
                            $scope.getServerList($scope, $http);
                            $scope.getCloudHost();
                            layer.close(index2);
                        } else {
                            layer.close(index2);
                            layer.msg('删除失败', {icon: 2});
                        }
                    });
                }
            });
            $('.layui-layer-title').text('删除主机');
        });
    }

    //接入集群事件
    $scope.joinCluster = function (e) {
        var serverArr = [];
        angular.forEach($scope.serverList, function (item, index) {
            if (item.selected) {
                serverArr.push(item.id);
            }
        });

        layer.open({
            type: 1,
            area: ['300px', '150px'],
            title: '接入集群',
            content: "确定将主机接入该集群吗",
            btn: ['确定', '取消'],
            yes: function (index) {
                layer.close(index);
                clusterDetailREST.joinCluster({
                    clusterId: clusterId,
                    userId: globalUserId,
                    ids: serverArr,
                    'envId': envId
                }, function (result) {
                    if (result.result == "registryError") {
                        layer.msg('无法接入集群，镜像仓库地址无法获取', {icon: 2});
                    } else {
                        layer.msg('主机正在接入集群，请耐心等待5分钟。。。。');
                        $("#updatebutton").attr('disabled', "true");
                        $("#delbutton").attr('disabled', "true");
                        $("#joinbutton").attr('disabled', "true");
                    }
                });
                setTimeout(function () {
                    $scope.getServerList($scope, $http);
                }, 1000);
            }
        });

    }

    //更新主机事件
    $scope.editHost = {};
    $scope.updateHost = function (e) {
        var serverIpTmp;
        var serverNameOld;
        $('input.checkinput:checked').each(function () {
            $scope.editHost.id = $(this).val();
            var tdObject = $(this).parents(".server-tr");
            $scope.editHost.serverName = tdObject.find(".servername-td").attr("id");
            serverNameOld = $scope.editHost.serverName;
            $scope.editHost.serverType = tdObject.find(".servertype-td").attr("id");
            serverIpTmp = tdObject.find(".serverip-td").attr("id");
            $scope.editHost.serverIP = serverIpTmp;
        });

        layui.use('layer', function () {
            var layer = layui.layer;
            layer.open({
                type: 1,
                area: ['600px', '350px'],
                content: $('#editHost'),
                btnAlign: 'c',
                btn: ['确定', '取消'],
                yes: function (index) {
                    updateServer(serverNameOld);
                },
                end: function () {
                    $('#editHost').hide();
                    $scope.getServerList($scope, $http);
                    $("#updatebutton").attr('disabled', "true");
                    $("#delbutton").attr('disabled', "true");
                    $("#joinbutton").attr('disabled', "true");
                }
            });
            $('.layui-layer-title').text('更新' + serverIpTmp);
        });
    }

    //更新主机信息
    function updateServer(serverNameOld) {
        if (!serverNameCheck($('#editServerName')) || !requiredCheck($('#editServerType'), '主机类型不能为空')) {
            return false;
        }
        if ($scope.clusterData.isHA != 1 && $scope.editHost.serverType == 1) {
            for (var i = 0; i < $scope.serverList.length; i++) {
                if (1 == $scope.serverList[i].serverType && ($scope.serverList[i].serverIP != $scope.editHost.serverIP)) {
                    layer.msg('目前仅支持一个master节点', {
                        icon: 2
                    });
                    return;
                }
            }
        }
        var formData = $scope.editHost;

        if (serverNameOld != $scope.editHost.serverName) {
            clusterDetailREST.validateClusterServerName({
                "clusterId": clusterId,
                'serverName': $scope.editHost.serverName,
                'envId': envId
            }, function (result) {
                if (result.data == true) {
                    clusterDetailREST.updateClusterServer({
                        "clusterId": clusterId,
                        'envId': envId
                    }, formData, function (result) {
                        if (result.data == true) {
                            layer.msg('更新成功');
                            $("#updatebutton").attr('disabled', "true");
                            $("#delbutton").attr("disabled");
                            $("#joinbutton").attr('disabled', "true");
                            $scope.getServerList($scope, $http);
                            closeLayer();
                        } else {
                            layer.msg('更新失败', {icon: 2});
                        }
                    });
                } else {
                    layer.msg('主机名已被占用', {icon: 2});
                }
            });
        } else {
            clusterDetailREST.updateClusterServer({
                "clusterId": clusterId,
                'envId': envId
            }, formData, function (result) {
                if (result.data == true) {
                    layer.msg('更新成功');
                    $("#updatebutton").attr('disabled', "true");
                    $("#delbutton").attr("disabled");
                    $("#joinbutton").attr('disabled', "true");
                    $scope.getServerList($scope, $http);
                    closeLayer();
                } else {
                    layer.msg('更新失败');
                }
            });
        }
    }

    //发布集群
    $scope.deployCluster = function () {
        //判断浮动IP是否填写
        if ($scope.clusterData.isHA == 1 && ($scope.clusterData.floadIp == "" || $scope.clusterData.floadIp == null)) {
            layer.msg('HA,请填写浮动IP', {
                icon: 2
            });
            return;
        }

        layui.use('layer', function () {
            var layer = layui.layer;
            layer.open({
                type: 1,
                area: ['300px', '150px'],
                content: "确定发布该集群",
                btnAlign: 'c',
                btn: ['确定', '取消'],
                yes: function (index) {
                    layer.close(index);
                    clusterDetailREST.deployCluster({
                        clusterId: clusterId,
                        userId: globalUserId,
                        'envId': envId
                    }, function (result) {
                        if (result.result == "registryError") {
                            layer.msg('无法部署集群，镜像仓库地址无法获取', {
                                icon: 2
                            });
                        } else {
                            layer.msg('正在发布集群，请耐心等待......');
                        }
                    });
                    setTimeout(function () {
                        $scope.getCluster();
                        $scope.getServerList($scope, $http);
                    }, 1000)
                }
            });
            $('.layui-layer-title').text('发布集群');
        });
    }

    //刷新主机状态
    $scope.refreshClusterServer = function () {
        //运行或者异常才会刷新
        if ($scope.clusterStatus == 2 || $scope.clusterStatus == 5) {
            $scope.getServerList(1);
        }
    }

    //查看集群服务详情
    $scope.serviceCheck = function () {
        layui.use('layer', function () {
            var layer = layui.layer;
            layer.open({
                type: 2,
                area: ['980px', '600px'],
                content: "../app/AppList.html?clusterId=" + clusterId + "&isSimple=true",


            });
            $('.layui-layer-title').text('详细信息');
        });
    }

    //添加修改浮动IP
    $scope.modifyFloadip = function () {
        $('#floadipForm').show();
        $scope.floadIp = $scope.clusterData.floadIp;
        layui.use('layer', function () {
            var layer = layui.layer;
            layer.open({
                type: 1,
                title: '高可用浮动IP',
                area: ['600px', '250px'],
                content: $('#floadipForm'),
                btnAlign: 'c',
                btn: ['确定', '取消'],
                yes: function (index) {
                    var floadIp = $('#floadIp').val();
                    clusterDetailREST.updateFloadIp({
                        'clusterId': clusterId,
                        'floadIp': floadIp,
                        'envId': envId,
                    }, function (result) {
                        getClusterDetailForFloadIp();
                    });
                    layer.close(index);
                },
                end: function () {
                    $('#floadipForm').hide();
                }
            });

        });
    }

    //保存存储信息
    $scope.clusterStorage = {};
    $scope.saveClusterStorage = function () {
        commonCheck($('#storageUserName'));
        commonCheck($('#storagePassword'));
        commonCheck($('#storageClusterId'));
        ipPortChectk($('#storageAddr'));
        if ($('.check-result').length != 0) {
            return false;
        }
        var index = layer.load(0, {shade: [0.4, '#888']});
        $scope.clusterStorage.clusterId = clusterId;
        clusterDetailREST.saveClusterStorage({
            "clusterId": clusterId,
            'envId': envId
        }, $scope.clusterStorage, function (result) {
            layer.msg('保存成功', {icon: 1});
            layer.close(index);
        }, function (error) {
            layer.msg('保存失败', {icon: 2});
            layer.close(index);
        });
    }

    //标签
    $scope.labelData = {};
    $scope.serverLabelList = {};
    $scope.labelEditData = {};
    var addLabelFlag = true;//防重复提交标志
    //弹出标签窗口
    $scope.openLabelWindow = function (serverName, serverStatus) {
        addLabelFlag = true;
        $scope.labelData.serverName = serverName;
        $scope.labelData.serverStatus = serverStatus;
        $scope.labelData.clusterId = clusterId;
        clusterDetailREST.getServerLabels({
            "clusterId": clusterId,
            "serverName": serverName,
            'envId': envId
        }, function (result) {
            $scope.serverLabelList = result.data;
        });
        layer.open({
            type: 1,
            title: "主机：" + serverName,
            area: ['800px', '450px'],
            content: $('#serverLabel'),
            end: function () {
                $('#serverLabel').hide();
            }
        });
    }
    //添加标签
    $scope.addLabel = function (event) {
        if ($scope.labelData.serverStatus != 2) {
            layer.msg('主机未接入，或状态不正常，无法添加', {icon: 2});
            return;
        }
        if (!addLabelFlag) {
            return;
        }
        addLabelFlag = false;
        if (!labelKeyCheck($('#labelAddKey')) || !labelKeyCheck($('#labelAddValue'))) {
            addLabelFlag = true;
            return false;
        }
        var loading = layui.loading('请稍候...');
        clusterDetailREST.validateLabelName({
            "clusterId": clusterId,
            "serverName": $scope.labelData.serverName,
            "labelKey": $scope.labelData.labelKey,
            'envId': envId
        }, function (result) {
            if (result.data) {
                clusterDetailREST.addServerLabel({
                    "clusterId": clusterId,
                    "serverName": $scope.labelData.serverName,
                    'envId': envId
                }, $scope.labelData, function (result) {
                    if (result.data) {
                        layer.close(loading);
                        layer.msg('添加标签成功', {icon: 1});
                        clusterDetailREST.getServerLabels({
                            "clusterId": clusterId,
                            "serverName": $scope.labelData.serverName,
                            'envId': envId
                        }, function (result) {
                            $scope.serverLabelList = result.data;
                            $scope.labelData.labelKey = "";
                            $scope.labelData.labelValue = "";
                            addLabelFlag = true;
                        });
                    } else {
                        layer.close(loading);
                        layer.msg('添加标签异常', {icon: 2});
                        addLabelFlag = true;
                    }
                });
            } else {
                layer.close(loading);
                layer.msg('该标签key已存在', {icon: 2});
                addLabelFlag = true;
            }
        }, function (error) {
            layer.close(loading);
            errorHandler(error);
        });

    }
    //删除标签
    $scope.deleteServerLabel = function (labelKey) {
        if ($scope.labelData.serverStatus != 2) {
            layer.msg('主机未接入，或状态不正常，无法删除', {icon: 2});
            return;
        }
        layer.confirm('确定删除该标签吗？', {
            btn: ['确定', '取消']
        }, function () {
            var loading = layui.loading('请稍候...');
            clusterDetailREST.deleteServerLabel({
                "clusterId": $scope.labelData.clusterId,
                "serverName": $scope.labelData.serverName,
                "labelKey": labelKey,
                "envId": envId
            }, function (result) {
                if (result.data) {
                    layer.close(loading);
                    layer.msg('删除成功', {icon: 1});
                    clusterDetailREST.getServerLabels({
                        "clusterId": clusterId,
                        "serverName": $scope.labelData.serverName,
                        "envId": envId
                    }, function (result) {
                        $scope.serverLabelList = result.data;
                    });
                    $('#serverLabelEdit').hide();
                    $('#serverLabelAdd').show();

                } else {
                    layer.close(loading);
                    layer.msg('删除失败', {icon: 1});
                }
            }, function (error) {
                layer.close(loading);
                errorHandler(error);
            });
        });
    }

    //更新标签界面切换
    $scope.updateServerLabel = function (modelData) {
        $scope.labelEditData = angular.copy(modelData);
        $scope.labelEditData.clusterId = clusterId;
        $scope.labelEditData.serverName = $scope.labelData.serverName;
        $('#serverLabelAdd').hide();
        $('#serverLabelEdit').show();
    }

    //更新标签
    $scope.updateLabel = function () {
        if ($scope.labelData.serverStatus != 2) {
            layer.msg('主机未接入，或状态不正常，无法修改', {icon: 2});
            return;
        }
        if (!labelKeyCheck($('#labelEditValue'))) {
            return false;
        }
        var loading = layui.loading('请稍候...');
        clusterDetailREST.updateServerLabel({
            "clusterId": clusterId,
            "serverName": $scope.labelEditData.serverName,
            "envId": envId
        }, $scope.labelEditData, function (result) {
            layer.close(loading);
            if (result.data) {
                layer.msg('修改成功', {icon: 1});
                clusterDetailREST.getServerLabels({
                    "clusterId": clusterId,
                    "serverName": $scope.labelData.serverName,
                    "envId": envId
                }, function (result) {
                    $scope.serverLabelList = result.data;
                });
            } else {
                layer.msg('修改异常', {icon: 2});
            }
        }, function (error) {
            layer.close(loading);
            errorHandler(error);
        });
    }

    //取消更新
    $scope.cancellUpdateLabel = function () {
        $('#serverLabelEdit').hide();
        $('#serverLabelAdd').show();
    }

    $scope.selectedAll = false;
    // 全选
    $scope.selectAll = function () {
        var selected = $scope.selectedAll = !$scope.selectedAll;
        angular.forEach($scope.serverList, function (item, index) {
            item.selected = selected;
        });
        $scope.checkAll($scope.selectedAll);
    };

    $scope.select = function (clusterServer) {
        clusterServer.selected = !clusterServer.selected;
        if (clusterServer.selected) {
            var all = true;
            angular.forEach($scope.serverList, function (item, index) {
                all = all && item.selected;
            });
            $scope.selectedAll = all;
        } else {
            $scope.selectedAll = false;
        }
        $scope.checkServer();
    }

    //设置按钮是否可见
    $scope.checkAll = function (el) {
        if (el) {
            $scope.checkServer();
        } else {
            $("#updatebutton").attr('disabled', "true");
            $("#delbutton").attr("disabled", "true");
            $("#joinbutton").attr('disabled', "true");
        }
    }

    $scope.checkServer = function () {
        var buttonFlag = true;
        var deleteButtonFlag = true;
        var checkNum = 0;
        angular.forEach($scope.serverList, function (item, index) {
            if (item.selected) {
                serverStatus = item.status;
                serverType = item.serverType;
                if (serverStatus != 0 && typeof (serverStatus) != "undefined") {
                    buttonFlag = false;
                }
                if (serverStatus == 1 || serverStatus == 4 || (serverType == 1 && serverStatus != 0)) {
                    deleteButtonFlag = false;
                }
                if (typeof (serverStatus) != "undefined") {
                    checkNum = checkNum + 1;
                }
            }
        });

        if (buttonFlag && checkNum == 1) {
            $("#updatebutton").removeAttr("disabled");
        } else {
            $("#updatebutton").attr('disabled', "true");
        }
        if (deleteButtonFlag && checkNum != 0) {
            $("#delbutton").removeAttr("disabled");
        } else {
            $("#delbutton").attr('disabled', "true");
        }
        if (buttonFlag && checkNum != 0 && global_clusterStatus == 2) {
            $("#joinbutton").removeAttr("disabled");
        } else {
            $("#joinbutton").attr('disabled', "true");
        }
    }

//######################################################################################################################   
    //初始化

    $(function () {
        $(".knob").knob();
        //主机nav,监控nav切换
        $('.detail-info .nav a').click(function () {
            $(this).addClass('active').siblings('a').removeClass('active');
            var id = $(this).data('nav');
            $('#' + id).show().siblings().hide();
            $('#' + id).children().show();

            if (id == "storage") {
                if ($scope.clusterStatus == 2 || $scope.clusterStatus == 5) {
                    clusterDetailREST.getClusterStorage({"clusterId": clusterId, "envId": envId}, function (result) {
                        $scope.clusterStorage = result.data;
                    });
                } else {
                    $("#storageButton").attr('disabled', "true");
                }
            }

            if (id == "monitor") {
                //3.集群未发布或者正在发布，无法监控
                if ($scope.clusterStatus != 0 && $scope.clusterStatus != 1) {
                    var diskCssHeight = 350 + parseInt(serverNames.length / 4) * 100;
                    cpuChart = echarts.init(document.getElementById('mainCPU'));
                    memChart = echarts.init(document.getElementById('mainMem'));
                    diskChart2 = echarts.init(document.getElementById('mainDisk2'));
                    getCpu(scope, http, "10m");
                    getMem(scope, http, "10m");
                    getDisk(scope, http, "10m");
                    //每隔一分钟刷新一次
                    if (!monitorInitFlag) {
                        setInterval(function () {
                            $("#10mButton").addClass('bgMonitorSelect').siblings('button').removeClass(
                                'bgMonitorSelect');
                            getCpu(scope, http, "10m");
                            getMem(scope, http, "10m");
                            getDisk(scope, http, "10m");
                        }, 60000);
                        monitorInitFlag = true;
                    }
                }
            }
        });
    });
});

layui.use('form', function () {
    var form = layui.form();
});

//重置表单
function resetHostForm() {
    $("#serverIP").val("");
    $("#serverType").val("");
    $("#serverName").val("");
    $('#addHost').show();
    layui.render();
}

$('body').on('keyup', '#editServerName', function () {
    var _this = $(this);
    if (_this.val() == "" || _this.val() == null) {
        return false;
    }
    return serverNameCheck(_this);
});

$('body').on('keyup', '#serverName', function () {
    var _this = $(this);
    if (_this.val() == "" || _this.val() == null) {
        return false;
    }
    return serverNameCheck(_this);
});


$('body').on('change', '#serverIP', function () {
    var info = '主机IP不能为空';
    requiredCheck($(this), info);
});

$('body').on('change', '#serverType', function () {
    var info = '主机类型不能为空';
    requiredCheck($(this), info);
});

$('body').on('change', '#editServerType', function () {
    var info = '主机类型不能为空';
    requiredCheck($(this), info);
});

$('body').on('keyup', '#storageUserName', function () {
    var info = '必填，不能为空';
    var validResult = requiredCheck($(this), info);
    if (validResult) {
        var _this = $(this);
        commonCheck(_this);
    }
});

$('body').on('keyup', '#storagePassword', function () {
    var info = '必填，不能为空';
    var validResult = requiredCheck($(this), info);
    if (validResult) {
        var _this = $(this);
        commonCheck(_this);
    }
    ;
});

$('body').on('keyup', '#storageClusterId', function () {
    var info = '必填，不能为空';
    var validResult = requiredCheck($(this), info);
    if (validResult) {
        var _this = $(this);
        commonCheck(_this);
    }
});

$('body').on('keyup', '#storageAddr', function () {
    var info = '必填，不能为空';
    requiredCheck($(this), info);
    var validResult = requiredCheck($(this), info);
    if (validResult) {
        var _this = $(this);
        ipPortChectk(_this);
    }
});

$('body').on('keyup', '#labelAddKey', function () {
    var _this = $(this);
    if (_this.val() == "" || _this.val() == null) {
        return false;
    }
    return labelKeyCheck(_this);
});

$('body').on('keyup', '#labelAddValue', function () {
    var _this = $(this);
    if (_this.val() == "" || _this.val() == null) {
        return false;
    }
    return labelKeyCheck(_this);
});

$('body').on('keyup', '#labelEditValue', function () {
    var _this = $(this);
    if (_this.val() == "" || _this.val() == null) {
        return false;
    }
    return labelKeyCheck(_this);
});

function labelKeyCheck(_this) {
    var reg = /^[a-zA-Z0-9._-]+$/;
    var info = '仅允许输入字母和数字和点号和中划线和下划线，且在50个字符内';
    if (!reg.test(_this.val()) || _this.val().length > 50) {
        setError(_this, info);
        return false;
    } else {
        setSuccess(_this);
        return true;
    }
}

function serverNameCheck(_this) {
    var reg = /^[a-z0-9.-]+$/;
    var info = '仅允许输入小写字母和数字和点号和中划线，且在50个字符内';
    if (!reg.test(_this.val()) || _this.val().length > 50) {
        setError(_this, info);
        return false;
    } else {
        setSuccess(_this);
        return true;
    }
}


function commonCheck(_this) {
    var reg = /^[a-zA-Z0-9]+$/;
    var info = '仅允许输入字母和数字，且在50个字符内';
    if (!reg.test(_this.val()) || _this.val().length > 50) {
        setError(_this, info);
        return false;
    } else {
        setSuccess(_this);
    }
}

function ipPortChectk(_this) {
    var protocol = "http";
    //ip的正则表达式
    var strIP = "(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|[1-9])\\.(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|\\d)\\.(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|\\d)\\.(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|\\d)";
    //端口的正则表达式
    var strPort = "([0-9]|[1-9]\\d{1,3}|[1-5]\\d{4}|6[0-5]{2}[0-3][0-5])";
    //检测IP:Port地址格式
    var v_ipPort_reg = new RegExp("^" + protocol + "\\:\\/\\/" + strIP + "\\:" + strPort + "$");
    var info = '输入有误，格式：http://10.10.10.114:8080';
    if (!v_ipPort_reg.test(_this.val())) {
        setError(_this, info);
        return false;
    } else {
        setSuccess(_this);
    }

}

function requiredCheck(_this, info) {
    if (_this.val() == '') {
        setError(_this, info);
        return false;
    } else {
        setSuccess(_this);
        return true;
    }
}

//检验
app.directive('commonValid', function () {
    return {
        require: "ngModel",
        link: function (scope, element, attr, ngModel) {
            ngModel.$parsers.push(function (value) {
                var reg = new RegExp("^[a-z0-9]+$");
                var validity = ngModel.$isEmpty(value) || reg.test(value);
                ngModel.$setValidity('commonValid', validity);
                return value;
            });
        }
    };
})

//IP检验
app.directive('ipValid', function () {
    return {
        require: "ngModel",
        link: function (scope, element, attr, ngModel) {
            ngModel.$parsers.push(function (value) {
                var reg = new RegExp("^(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|[0-9])\\.(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|\\d)\\.(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|\\d)\\.(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|\\d)$");
                var validity = ngModel.$isEmpty(value) || reg.test(value);
                ngModel.$setValidity('ipValid', validity);
                return value;
            });
        }
    };
})

//如果集群状态处于0/1，则禁用监控按钮
function initMonitoryBtn() {
    $("#monitor").find("button").each(function () {
        $(this).attr('disabled', "true");
    })
}
