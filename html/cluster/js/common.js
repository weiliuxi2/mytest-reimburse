// 统一错误处理
function errorHandler(err) {
    if (typeof err == 'object' && err.status==-1) {
        layer.msg('服务不可用，请稍后再试...', {icon: 5, time: 1000});
    }
    if (err.status == 500) {
        layer.msg('系统异常，请稍后再试...', {icon: 5, time: 1000});
    }
}