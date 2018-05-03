var app = angular.module('test', ['ngResource']);
app.controller('myTest', function ($scope, $http, $resource) {


});

app.directive('pwCheck', [function () {
    return {
        require: 'ngModel',
        link: function (scope, elem, attrs, ctrl) {
            var firstPassword = '#' + attrs.pwCheck;
            elem.add(firstPassword).on('keyup', function () {
                scope.$apply(function () {
                    var v = elem.val()===$(firstPassword).val();
                    ctrl.$setValidity('pwmatch', v);
                });
            });
        }
    }
}]);

$('body').on('keyup', '.layui-input[name=a]', function () {
    clusterNameCheck($(this));
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

// 设置验证为不通过的状态
function setError(node, info) {
    var _this = $(node);
    if (_this.next('.check-result').length == '0') {
        _this.after('<div class="check-result">' + info + '</div>');
        _this.parent().prev('label').addClass('check-result');
    } else {
        _this.next('.check-result').html(info);
    }
    var selectInput = _this.parents('.select-input');
    if (selectInput.length == '1') {
        selectInput.next('.select-list').css('margin-top', '20px');
    }
    _this.css('border-color', '#fb6262');
    _this.parents('.form-block').find('.layui-btn-confirm').prop('disabled', true);
};


// 设置验证为通过的状态
function setSuccess(node) {
    var _this = $(node);
    _this.next('.check-result').remove();
    _this.css('border-color', '#d2d2d2');
    var selectInput = _this.parents('.select-input');
    if (selectInput.length == '1') {
        selectInput.next('.select-list').css('margin-top', '5px');
    }
    _this.parent().prev('label').removeClass('check-result');
    _this.parents('.form-block').find('.layui-btn-confirm').prop('disabled', false);
};