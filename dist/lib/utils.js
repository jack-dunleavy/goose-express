"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJSONQueryParam = void 0;
var error_messages_1 = require("./error-messages");
var errors_1 = require("./errors");
exports.parseJSONQueryParam = function (jsonString, field) {
    try {
        var parsed = JSON.parse(jsonString);
        return parsed;
    }
    catch (e) {
        throw new errors_1.BadRequestError(error_messages_1.badRequestErrors.parsingQueryParamFailed(field), error_messages_1.badRequestDetail.parsingQueryParamFailed(field));
    }
};
