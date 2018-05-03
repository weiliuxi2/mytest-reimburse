(function (angular) {

    var _userId=globalUserId;
    var myModule = angular.module("commonApp",['ngResource']);

    myModule.service('commonService',['$resource',function ($resource,$scope) {
        var API = {
            projects: $resource('',{},{
                getProject: {
                    method : 'GET',
                    url : baseURL + '/projects',
                }
            }),
            env: $resource('',{},{
                getEnv: {
                    method : 'GET',
                    url : baseURL + '/envs',
                }
            })
        };
        var paasEnvDatas={};
        return {
            getProjects: function () {
                var projectDatas = {};
                API.projects.getProject({'userId':_userId},function(result) {
                    if(result.code == 1000){
                        angular.forEach(result.data, function(item, index){
                            projectDatas[item.id] = item.projectName;
                        });
                    } else {
                        var msg = result.data.code + '：' +result.data.message;
                        console.log('出现已知异常：' , msg);
                        layer.msg(msg, {icon : 2});
                    }
                });
                return projectDatas;
            },

            getEnvs: function () {
                var envDatas = {};
                API.env.getEnv({'userId':_userId},function(result) {
                    if(result.code == 1000){
                        angular.forEach(result.data, function(item, index){
                            envDatas[item.id] = item.areaDTO.areaDTO.name + (item.areaDTO.areaDTO.name == null ? '' : '-'  )+
                                item.areaDTO.name + "-" + item.name;
                            if (item.envType == 1) {
                                paasEnvDatas[item.id] = item.areaDTO.areaDTO.name + (item.areaDTO.areaDTO.name == null ? '' : '-'  )+
                                    item.areaDTO.name + "-" + item.name;
                            }
                        });
                    } else {
                        var msg = result.data.code + '：' +result.data.message;
                        console.log('出现已知异常：' , msg);
                        layer.msg(msg, {icon : 2});
                    }
                });
                return envDatas;
            },
            paasEnvData : paasEnvDatas,

        }
    }]);

    myModule.directive('regionSelect',function () {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: function (elem, attrs) {
                return attrs.templateUrl || 'env.html'
            },
        }
    });




})(angular);