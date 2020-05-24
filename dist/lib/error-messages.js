"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundErrors = exports.badRequestDetail = exports.badRequestErrors = void 0;
var generateErrorDetail = function (msg, param, location) {
    return [
        {
            msg: msg,
            param: param,
            location: location,
        },
    ];
};
exports.badRequestErrors = {
    validationFailed: "The document provided failed validation",
    queryParameterRequired: function (param) {
        return "Query pararameter (req.query." + param + ") provided is required";
    },
    parsingQueryParamFailed: function (param) {
        return "Query pararameter (req.query." + param + ") provided is invalid. Error parsing JSON contents";
    },
    projectionInvalid: "Query parameter (req.query.fields is invalid. Cannot both include and exclude in a Mongo projection",
    keyNotFound: function (key) {
        return "The requested key: " + key + " does not exist on this document";
    },
    methodInvalid: function (method) { return "Cannot " + method + " to the route specified"; },
    missingUpdate: "PUT requests on nested fields must contain the 'update' field",
};
exports.badRequestDetail = {
    parsingQueryParamFailed: function (param) {
        return generateErrorDetail("Invalid value for " + param, param, "query");
    },
    queryParameterRequired: function (param) {
        return generateErrorDetail("Query parameter " + param + " is required", param, "query");
    },
    projectionInvalid: generateErrorDetail("Invalid value for fields - cannot use inclusions and exclusions in the same query", "fields", "query"),
};
exports.notFoundErrors = {
    idNotFound: function (id) {
        return "The resource specified by ID: " + id + " was not found";
    },
    idInvalid: function (id) { return "The ID provided: " + id + " is not a valid mongo id"; },
};
