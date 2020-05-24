"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.CustomError = void 0;
var CustomError = /** @class */ (function (_super) {
    __extends(CustomError, _super);
    function CustomError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return CustomError;
}(Error));
exports.CustomError = CustomError;
var BadRequestError = /** @class */ (function (_super) {
    __extends(BadRequestError, _super);
    function BadRequestError(message, detail) {
        var _this = _super.call(this, message) || this;
        _this.reason = "Bad Request";
        _this.code = 400;
        _this.detail = detail ? detail : [];
        return _this;
    }
    return BadRequestError;
}(CustomError));
exports.BadRequestError = BadRequestError;
var UnauthorizedError = /** @class */ (function (_super) {
    __extends(UnauthorizedError, _super);
    function UnauthorizedError(message, detail) {
        var _this = _super.call(this, message) || this;
        _this.reason = "Unauthorized";
        _this.code = 401;
        _this.detail = detail ? detail : [];
        return _this;
    }
    return UnauthorizedError;
}(CustomError));
exports.UnauthorizedError = UnauthorizedError;
var ForbiddenError = /** @class */ (function (_super) {
    __extends(ForbiddenError, _super);
    function ForbiddenError(message, detail) {
        var _this = _super.call(this, message) || this;
        _this.reason = "Forbidden";
        _this.code = 403;
        _this.detail = detail !== null && detail !== void 0 ? detail : [];
        return _this;
    }
    return ForbiddenError;
}(CustomError));
exports.ForbiddenError = ForbiddenError;
var NotFoundError = /** @class */ (function (_super) {
    __extends(NotFoundError, _super);
    function NotFoundError(message) {
        var _this = _super.call(this, message) || this;
        _this.reason = "Not Found";
        _this.code = 404;
        return _this;
    }
    return NotFoundError;
}(CustomError));
exports.NotFoundError = NotFoundError;
var ConflictError = /** @class */ (function (_super) {
    __extends(ConflictError, _super);
    function ConflictError(message, detail) {
        var _this = _super.call(this, message) || this;
        _this.reason = "Conflict";
        _this.code = 409;
        _this.detail = detail ? detail : [];
        return _this;
    }
    return ConflictError;
}(CustomError));
exports.ConflictError = ConflictError;
var InternalError = /** @class */ (function (_super) {
    __extends(InternalError, _super);
    function InternalError(message, detail) {
        var _this = _super.call(this, message) || this;
        _this.reason = "Server Error";
        _this.code = 500;
        _this.detail = detail ? detail : [];
        return _this;
    }
    return InternalError;
}(CustomError));
exports.InternalError = InternalError;
