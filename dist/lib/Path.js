"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Path = /** @class */ (function () {
    function Path(path, omitLastSegment) {
        var _this = this;
        if (omitLastSegment === void 0) { omitLastSegment = false; }
        this.isValidOid = function (oid) {
            return /^[0-9a-fA-F]{24}$/.test(oid);
        };
        this.parsePath = function (path) {
            if (path === "/") {
                return [];
            }
            return path.replace(/^\//, "").replace(/\/$/, "").split("/");
        };
        var pathSegments = this.parsePath(path);
        var finalSegment = omitLastSegment
            ? pathSegments.length - 1
            : pathSegments.length;
        var toProcess = pathSegments.slice(1, finalSegment);
        var arrayFilters = [];
        var arrayFilterSearchPath = [];
        toProcess.forEach(function (pathSegment) {
            var _a;
            /**
             * If the current param is an OID it means we must search for the id
             * in the field labelled by the previous param
             */
            if (_this.isValidOid(pathSegment)) {
                var arrayField = pathSegments[pathSegments.indexOf(pathSegment) - 1];
                arrayFilters.push((_a = {}, _a[arrayField + "._id"] = pathSegment, _a));
                arrayFilterSearchPath.push("$[" + arrayField + "]");
            }
            else {
                arrayFilterSearchPath.push(pathSegment);
            }
        });
        this.pathSegments = pathSegments;
        this._arrayFilterSearchPath = arrayFilterSearchPath;
        this.arrayFilters = arrayFilters;
    }
    Object.defineProperty(Path.prototype, "arrayFilterSearchPath", {
        get: function () {
            return this._arrayFilterSearchPath.join(".");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Path.prototype, "finalPathSegment", {
        get: function () {
            return this.pathSegments[this.pathSegments.length - 1];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Path.prototype, "targetIsSubDoc", {
        get: function () {
            return this.isValidOid(this.pathSegments[this.pathSegments.length - 1]);
        },
        enumerable: false,
        configurable: true
    });
    return Path;
}());
exports.default = Path;
