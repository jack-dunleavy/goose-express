"use strict";
// Async error handling wrapper (https://strongloop.com/strongblog/async-error-handling-expressjs-es7-promises-generators/)
Object.defineProperty(exports, "__esModule", { value: true });
// Catches throws within routes and forwards them to the next error handling middleware
var withCatch = function (fn) { return function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return fn.apply(void 0, args).catch(args[2]);
}; };
exports.default = withCatch;
