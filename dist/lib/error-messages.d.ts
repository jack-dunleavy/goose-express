export interface ErrorDetail {
    msg: string;
    param?: string;
    location?: string;
}
export declare const badRequestErrors: {
    validationFailed: string;
    queryParameterRequired: (param: string) => string;
    parsingQueryParamFailed: (param: string) => string;
    projectionInvalid: string;
    keyNotFound: (key: string) => string;
    methodInvalid: (method: string) => string;
    missingUpdate: string;
};
export declare const badRequestDetail: {
    parsingQueryParamFailed: (param: string) => ErrorDetail[];
    queryParameterRequired: (param: string) => ErrorDetail[];
    projectionInvalid: ErrorDetail[];
};
export declare const notFoundErrors: {
    idNotFound: (id: string) => string;
    idInvalid: (id: string) => string;
};
