"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var mongoose_1 = require("mongoose");
var error_messages_1 = require("./lib/error-messages");
var errors_1 = require("./lib/errors");
var Path_1 = __importDefault(require("./lib/Path"));
var utils_1 = require("./lib/utils");
var with_catch_1 = __importDefault(require("./lib/with-catch"));
var GooseExpress = /** @class */ (function () {
    function GooseExpress(model, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        this.formatValidationErrorDetail = function (e) {
            var formattedErrors;
            var errorDetail = e.errors;
            formattedErrors = Object.keys(errorDetail).map(function (error) {
                if (errorDetail[error].errors) {
                    var nestedDetail_1 = errorDetail[error].errors;
                    return Object.keys(nestedDetail_1).map(function (nestedError) {
                        return {
                            msg: nestedDetail_1[nestedError].message,
                            path: error + ".*." + nestedError,
                            location: "body",
                        };
                    });
                }
                return {
                    msg: errorDetail[error].message,
                    path: error,
                    location: "body",
                };
            });
            // @ts-ignore
            return formattedErrors.flat();
        };
        this.formatCastErrorDetail = function (e) {
            return [
                {
                    msg: e.message,
                    path: e.path,
                    location: "body",
                },
            ];
        };
        this.handleValidationErrors = function (fn) { return __awaiter(_this, void 0, void 0, function () {
            var res, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, fn()];
                    case 1:
                        res = _a.sent();
                        return [2 /*return*/, res];
                    case 2:
                        e_1 = _a.sent();
                        if (e_1.name === "ValidationError") {
                            throw new errors_1.BadRequestError(error_messages_1.badRequestErrors.validationFailed, this.formatValidationErrorDetail(e_1));
                        }
                        else if (e_1.name === "CastError") {
                            throw new errors_1.BadRequestError(error_messages_1.badRequestErrors.validationFailed, this.formatCastErrorDetail(e_1));
                        }
                        else {
                            throw new errors_1.InternalError(e_1);
                        }
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        this.parseQueryFilter = function (query) {
            if (typeof query === "string") {
                return utils_1.parseJSONQueryParam(query, "query");
            }
            return {};
        };
        this.isValidOid = function (oid) {
            return /^[0-9a-fA-F]{24}$/.test(oid);
        };
        this.createRouter = function () {
            _this.router.get("/*", _this.get());
            _this.router.post("/*", _this.post());
            _this.router.delete("/*", _this.delete());
            _this.router.put("/*", _this.put());
            _this.router.patch("/*", _this.patch());
            return _this.router;
        };
        this.get = function () { return [
            with_catch_1.default(function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
                var path, documentID, fields, mongoQuery, projection, inclusions, exclusions, documents, nests, doc, response, _loop_1, this_1, state_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            path = new Path_1.default(req.path);
                            documentID = path.pathSegments[0];
                            fields = req.query.fields;
                            mongoQuery = this.parseQueryFilter(req.query.query);
                            projection = [];
                            if (typeof fields === "string") {
                                projection = utils_1.parseJSONQueryParam(fields, "fields").filter(function (n) { return typeof n === "string"; });
                                inclusions = projection.filter(function (field) { return !field.startsWith("-") && field !== "_id"; });
                                exclusions = projection.filter(function (field) { return field.startsWith("-") && field !== "-_id"; });
                                if (inclusions.length > 0 && exclusions.length > 0) {
                                    throw new errors_1.BadRequestError(error_messages_1.badRequestErrors.projectionInvalid, error_messages_1.badRequestDetail.projectionInvalid);
                                }
                            }
                            if (!(path.pathSegments.length === 0)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.model.find(mongoQuery, projection)];
                        case 1:
                            documents = _a.sent();
                            return [2 /*return*/, res.status(200).json({ data: documents })];
                        case 2:
                            nests = path.pathSegments.slice(1, path.pathSegments.length);
                            if (!this.isValidOid(path.pathSegments[0])) {
                                throw new errors_1.NotFoundError(error_messages_1.notFoundErrors.idInvalid(path.pathSegments[0]));
                            }
                            return [4 /*yield*/, this.model.findById(documentID)];
                        case 3:
                            doc = _a.sent();
                            if (!doc) {
                                throw new errors_1.NotFoundError(error_messages_1.notFoundErrors.idNotFound(documentID));
                            }
                            response = doc.toObject();
                            _loop_1 = function () {
                                var pathSegment = nests.shift();
                                if (!pathSegment) {
                                    return { value: void 0 };
                                }
                                if (this_1.isValidOid(pathSegment)) {
                                    response = response.find(function (subDoc) {
                                        return subDoc._id.equals(pathSegment);
                                    });
                                    if (!response) {
                                        throw new errors_1.NotFoundError(error_messages_1.notFoundErrors.idNotFound(pathSegment));
                                    }
                                }
                                else {
                                    if (!response[pathSegment]) {
                                        throw new errors_1.BadRequestError(error_messages_1.badRequestErrors.keyNotFound(pathSegment));
                                    }
                                    response = response[pathSegment];
                                }
                            };
                            this_1 = this;
                            // Recursively search the doc
                            // TODO this can probably be more 'Mongo'
                            while (nests.length > 0) {
                                state_1 = _loop_1();
                                if (typeof state_1 === "object")
                                    return [2 /*return*/, state_1.value];
                            }
                            return [2 /*return*/, res.status(200).json({ data: response })];
                    }
                });
            }); }),
        ]; };
        this.post = function () { return [
            with_catch_1.default(function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var path, document_1, updated;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.waitForIndex) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.model.init()];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            path = new Path_1.default(req.path);
                            if (!(path.pathSegments.length === 0)) return [3 /*break*/, 5];
                            document_1 = new this.model(req.body);
                            return [4 /*yield*/, this.handleValidationErrors(function () { return document_1.validate(); })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, document_1.save()];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, res.status(201).json(document_1)];
                        case 5:
                            /**
                             * Cannot POST to a specified document
                             */
                            if (path.pathSegments.length === 1) {
                                throw new errors_1.BadRequestError(error_messages_1.badRequestErrors.methodInvalid("POST"));
                            }
                            return [4 /*yield*/, this.handleValidationErrors(function () {
                                    var _a;
                                    return _this.model.findOneAndUpdate({ _id: path.pathSegments[0] }, {
                                        $push: (_a = {}, _a[path.arrayFilterSearchPath] = req.body, _a),
                                    }, {
                                        new: true,
                                        runValidators: true,
                                        lean: true,
                                        arrayFilters: path.arrayFilters,
                                    });
                                })];
                        case 6:
                            updated = _a.sent();
                            return [2 /*return*/, res.status(201).json({ data: updated })];
                    }
                });
            }); }),
        ]; };
        this.put = function () { return [
            with_catch_1.default(function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var path, updateResult, created, result;
                var _a;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!this.waitForIndex) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.model.init()];
                        case 1:
                            _b.sent();
                            _b.label = 2;
                        case 2:
                            path = new Path_1.default(req.path);
                            if (!path.pathSegments[0] || !this.isValidOid(path.pathSegments[0])) {
                                throw new errors_1.BadRequestError(error_messages_1.notFoundErrors.idInvalid(path.pathSegments[0]));
                            }
                            if (!(path.pathSegments.length === 1)) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.handleValidationErrors(function () {
                                    return _this.model.findByIdAndUpdate(path.pathSegments[0], req.body, 
                                    // @ts-ignore - overwrite isn't included in the declaration unfortunately
                                    { overwrite: true, upsert: true, lean: true, runValidators: true });
                                })];
                        case 3:
                            updateResult = _b.sent();
                            created = updateResult === null;
                            return [2 /*return*/, res.status(created ? 201 : 200).send()];
                        case 4: return [4 /*yield*/, this.model.findOneAndUpdate({ _id: path.pathSegments[0] }, {
                                $set: (_a = {},
                                    _a[path.arrayFilterSearchPath] = __assign(__assign({}, req.body), { _id: path.pathSegments[path.pathSegments.length - 1] }),
                                    _a),
                            }, {
                                new: true,
                                lean: true,
                                arrayFilters: path.arrayFilters,
                            })];
                        case 5:
                            result = _b.sent();
                            return [2 /*return*/, res.status(200).json({ data: result })];
                    }
                });
            }); }),
        ]; };
        this.patch = function () { return [
            with_catch_1.default(function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var query, mongoQuery, path, updateResult, updateResult, updateBody, updated;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            query = req.query.query;
                            mongoQuery = {};
                            path = new Path_1.default(req.path);
                            if (!(path.pathSegments.length === 0)) return [3 /*break*/, 2];
                            if (typeof query === "string") {
                                mongoQuery = utils_1.parseJSONQueryParam(query, "query");
                            }
                            return [4 /*yield*/, this.model.updateMany(mongoQuery, req.body)];
                        case 1:
                            updateResult = _a.sent();
                            return [2 /*return*/, res.status(200).json(updateResult)];
                        case 2:
                            if (!path.pathSegments[0] || !this.isValidOid(path.pathSegments[0])) {
                                throw new errors_1.BadRequestError(error_messages_1.notFoundErrors.idInvalid(path.pathSegments[0]));
                            }
                            if (!(path.pathSegments.length === 1)) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.handleValidationErrors(function () {
                                    return _this.model.findByIdAndUpdate(path.pathSegments[0], { $set: req.body }, { lean: true, upsert: false, new: true, runValidators: true });
                                })];
                        case 3:
                            updateResult = _a.sent();
                            if (!updateResult) {
                                throw new errors_1.NotFoundError(error_messages_1.notFoundErrors.idNotFound(path.pathSegments[0]));
                            }
                            return [2 /*return*/, res.status(200).json(updateResult)];
                        case 4:
                            updateBody = path.targetIsSubDoc ? req.body : req.body.update;
                            return [4 /*yield*/, this.handleValidationErrors(function () {
                                    var _a;
                                    return _this.model.findByIdAndUpdate(path.pathSegments[0], {
                                        $set: (_a = {}, _a[path.arrayFilterSearchPath] = updateBody, _a),
                                    }, {
                                        new: true,
                                        lean: true,
                                        arrayFilters: path.arrayFilters,
                                        runValidators: true,
                                    });
                                })];
                        case 5:
                            updated = _a.sent();
                            return [2 /*return*/, res.status(200).json({ data: updated })];
                    }
                });
            }); }),
        ]; };
        this.delete = function () { return [
            with_catch_1.default(function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var query, mongoQuery, path, result, doc, response;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            query = req.query.query;
                            path = new Path_1.default(req.path, true);
                            if (!(path.pathSegments.length === 0)) return [3 /*break*/, 2];
                            if (!query) {
                                throw new errors_1.BadRequestError(error_messages_1.badRequestErrors.queryParameterRequired("query"), error_messages_1.badRequestDetail.queryParameterRequired("query"));
                            }
                            if (typeof query === "string") {
                                mongoQuery = utils_1.parseJSONQueryParam(query, "query");
                            }
                            return [4 /*yield*/, this.model.deleteMany(mongoQuery)];
                        case 1:
                            result = _b.sent();
                            res.status(200).json(result);
                            _b.label = 2;
                        case 2:
                            /**
                             * Path parameter 0 must be a valid OID
                             */
                            if (!this.isValidOid(path.pathSegments[0])) {
                                throw new errors_1.NotFoundError(error_messages_1.notFoundErrors.idInvalid(path.pathSegments[0]));
                            }
                            if (!(path.pathSegments.length === 1)) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.model.findByIdAndDelete(path.pathSegments[0])];
                        case 3:
                            doc = _b.sent();
                            if (!doc) {
                                throw new errors_1.NotFoundError(error_messages_1.notFoundErrors.idNotFound(path.pathSegments[0]));
                            }
                            return [2 /*return*/, res.sendStatus(204)];
                        case 4: return [4 /*yield*/, this.model.findOneAndUpdate({ _id: path.pathSegments[0] }, {
                                $pull: (_a = {},
                                    _a[path.arrayFilterSearchPath] = {
                                        _id: new mongoose_1.Types.ObjectId(path.finalPathSegment),
                                    },
                                    _a),
                            }, { new: true, lean: true, arrayFilters: path.arrayFilters })];
                        case 5:
                            response = _b.sent();
                            return [2 /*return*/, res.json({ data: response })];
                    }
                });
            }); }),
        ]; };
        this.model = model;
        this.waitForIndex = options.waitForIndex || false;
        this.router = express_1.Router();
    }
    return GooseExpress;
}());
exports.default = GooseExpress;
