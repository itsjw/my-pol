'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Arg = function () {
  function Arg(re) {
    _classCallCheck(this, Arg);

    this.re = re;
  }

  _createClass(Arg, [{
    key: 'test',
    value: function test(arg) {
      return this.re.test(arg);
    }
  }]);

  return Arg;
}();

exports.isShort = new Arg(/^-([^\d-])$/);
exports.isLong = new Arg(/^--(\S+)/);
exports.isCombined = new Arg(/^-([^\d-]{2,})$/);
exports.isOption = function (arg) {
  return this.isShort.test(arg) || this.isLong.test(arg);
};
exports.optEquals = new Arg(/^(--\S+)=(.*)/);