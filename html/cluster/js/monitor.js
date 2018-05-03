var monitorURL = "/monitor/";
// 指定图表的配置项和数据
function load(serverSerias, date, title) {

	optionCpu = {
		color : [ '#e22c2c', '#4daf76', '#ff7f50', '#87cefa', '#da70d6',
				'#32cd32', '#6495ed', '#ff69b4', '#ba55d3', '#cd5c5c',
				'#ffa500', '#40e0d0', '#1e90ff', '#ff6347', '#7b68ee',
				'#00fa9a', '#ffd700', '#6699FF', '#ff6666', '#3cb371',
				'#b8860b', '#30e0e0' ],
		title : {
			text : title + "使用率",
		},
		tooltip : {
			trigger : 'axis'
		},
		legend : {
			x : '15%',
			data : serverNames
		},
		toolbox : {
			show : true,
			feature : {
				mark : {
					show : true
				},
				dataView : {
					show : true,
					readOnly : false
				},
				magicType : {
					show : true,
					type : [ 'line', 'bar' ]
				},
				restore : {
					show : true
				},
				saveAsImage : {
					show : true
				}
			}
		},
		calculable : false,
		xAxis : {
			type : 'category',
			boundaryGap : false,
			data : date,

		},
		yAxis : {
			type : 'value',
			axisLabel : {
				formatter : '{value} %'
			}
		},
		series : serverSerias
	};
}

// 获取主机CPU
function getCpu($scope, $http,date) {
	var paraData = "serverNames="+ serverNames + "&envId=" + envId + "&time=" + date;
	
	$http.get(baseURL + "/" + clusterId + "/monitors/cpu?" + paraData).then(
			function(result) {
				var tdata = result.data.data;
				var cpuDate = [];
				var serverSerias = [];
				for (var i = 0; i < tdata.length; i++) {
					
					if (i != 0 && tdata[i].length > tdata[i - 1].length)
					{
						cpuDate = [];
					}
					if (cpuDate.length == 0)
					{
						for ( var index in tdata[i]) {
							cpuDate.push(tdata[i][index].date);
						}
					}
				}
				for (var i = 0; i < tdata.length; i++) {
					var cpuUsage = [];
					serverIndex = tdata[i];
					
					var cpuDate2 = [];
					for ( var index in serverIndex) {
						cpuDate2.push(serverIndex[index].date);
					}
					
					for (var j = 0 ; j < cpuDate.length; j++) {
						if ($.inArray(cpuDate[j],cpuDate2) < 0) {
							cpuUsage.push(0);
						}else {
							cpuUsage.push(serverIndex[index].value);
						}
					}
					
					var seriasObject = {
						name : serverNames[i],
						type : 'line',
						data : cpuUsage,
						markPoint : {
							data : [ {
								type : 'max',
								name : '最大值'
							}, {
								type : 'min',
								name : '最小值'
							} ]
						},
						markLine : {
							data : [ {
								type : 'average',
								name : '平均值'
							} ]
						}
					};
					serverSerias.push(seriasObject);
				}
				if (tdata.length != 0)
				{
					load(serverSerias, cpuDate, "CPU");
					cpuChart.setOption(optionCpu);
				}
				
			});
}

// 获取主机内存
function getMem($scope, $http, date) {
//	var paraData = "serverNames="+ serverNames + "&clusterId=" + clusterId + "&time=" + date;
	var paraData = "serverNames="+ serverNames + "&envId=" + envId + "&time=" + date;
	$http.get(baseURL + "/" + clusterId + "/monitors/memory?"+ paraData).then(
			function(result) {
				var tdata = result.data.data;
				if (tdata == "" || tdata == null)
				{
					return;
				}
				console.log(tdata);
				var memDate = [];
				var serverSerias = [];
				for (var i = 0; i < tdata.length; i++) {
					
					if (i != 0 && tdata[i].length > tdata[i - 1].length)
					{
						memDate = [];
					}
					if (memDate.length == 0)
					{
						for ( var index in tdata[i]) {
							memDate.push(tdata[i][index].date);
						}
					}
				}
				for (var i = 0; i < tdata.length; i++) {
					var memUsage = [];
					serverIndex = tdata[i];
					var memDate2 = [];
					for ( var index in serverIndex) {
						memDate2.push(serverIndex[index].date);
					}
					
					for (var j = 0 ; j < memDate.length; j++) {
						if ($.inArray(memDate[j],memDate2) < 0) {
							memUsage.push(0);
						}else {
							memUsage.push(serverIndex[index].value);
						}
					}
					
					var seriasObject = {
						name : serverNames[i],
						type : 'line',
						data : memUsage,
						markPoint : {
							data : [ {
								type : 'max',
								name : '最大值'
							}, {
								type : 'min',
								name : '最小值'
							} ]
						},
						markLine : {
							data : [ {
								type : 'average',
								name : '平均值'
							} ]
						}
					};
					serverSerias.push(seriasObject);
				}
				load(serverSerias, memDate, "Memory");
				memChart.setOption(optionCpu);
			});
}

function loadDisk(serverSerias) {

	option = {
		color : [ '#e22c2c', '#4daf76', '#ff7f50', '#87cefa', '#da70d6',
				'#32cd32', '#6495ed', '#ff69b4', '#ba55d3', '#cd5c5c',
				'#ffa500', '#40e0d0', '#1e90ff', '#ff6347', '#7b68ee',
				'#00fa9a', '#ffd700', '#6699FF', '#ff6666', '#3cb371',
				'#b8860b', '#30e0e0' ],
		legend : {
			x : '15%',
			y : '3%',
			data : serverNames,
		},
		title : {
			text : '磁盘使用率',
			x : 'left'
		},
		toolbox : {
			show : true,
			feature : {
				dataView : {
					show : true,
					readOnly : false
				},
				magicType : {
					show : true,
					type : [ 'pie', 'funnel' ],
					option : {
						funnel : {
							width : '50%',
							height : '40%',
							itemStyle : {
								normal : {
									label : {
										formatter : function(params) {
											return 'other\n' + params.value
													+ '%\n'
										},

									}
								},
							}
						}
					},

				},
				restore : {
					show : true
				},
				saveAsImage : {
					show : true
				}
			}
		},
		series : serverSerias
	};
}

function getDisk($scope, $http,date) {
	var labelTop = {
		normal : {
			label : {
				show : true,
				position : 'center',
				formatter : '{b}',
				textStyle : {
					baseline : 'bottom'
				}
			}
		}
	};
	var labelFromatter = {
		normal : {
			label : {
				formatter : function(params) {
					return (100 - params.value).toFixed(2) + '%'
				},
				textStyle : {
					baseline : 'top'
				}
			}
		},
	}
	var labelBottom = {
		normal : {
			color : '#ccc',
			label : {
				show : true,
				position : 'center'
			},
			labelLine : {
				show : true
			}
		},
		emphasis : {
			color : '#ccc'
		}
	};
	var radius = [ 40, 60 ];

	var serverSerias = [];
	var serverNum = serverNames.length;
//	var paraData = "serverNames="+ serverNames + "&clusterId=" + clusterId + "&time=" + date;
	var paraData = "serverNames="+ serverNames + "&envId=" + envId + "&time=" + date;
	$http.get(baseURL + "/" + clusterId + "/monitors/disk?"+ paraData)
			.then(function(result) {
						var tdata = result.data.data;
						
						console.log(tdata);
						if ($.isEmptyObject(tdata))
						{
							return;
						}
						for (var i = 0; i <serverNum; i++) {
							var serverNode = serverNames[i];
							var serverDiskData = tdata[serverNode] * 100;
							var dataaa = [{
								name : 'other',
								value : 100 - serverDiskData,
								itemStyle : labelBottom
							}, {
								name : serverNames[i],
								value : serverDiskData,
								itemStyle : labelTop
							}];
							it = i % 4;
							var y = 130 + parseInt(i / 4) * 130;
							var aa = {
								type : 'pie',
								center : [ '20' * 1 + 20 * it + '%', y + 'px' ],
								radius : radius,
								itemStyle : labelFromatter,
								data : dataaa
							};
							serverSerias.push(aa);
						}
						loadDisk(serverSerias);
						diskChart2.setOption(option);

					});

}


