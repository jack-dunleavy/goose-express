export interface ErrorDetail {
    msg: string;
    param?: string;
    location?: string;
}
export declare class CustomError extends Error {
    reason: string;
    code: number;
    detail: ErrorDetail[];
}
export declare class BadRequestError extends CustomError {
    constructor(message: string, detail?: ErrorDetail[]);
}
export declare class UnauthorizedError extends CustomError {
    constructor(message: string, detail?: ErrorDetail[]);
}
export declare class ForbiddenError extends CustomError {
    constructor(message: string, detail?: ErrorDetail[]);
}
export declare class NotFoundError extends CustomError {
    constructor(message: string);
}
export declare class ConflictError extends CustomError {
    constructor(message: string, detail?: ErrorDetail[]);
}
export declare class InternalError extends CustomError {
    constructor(message: string, detail?: ErrorDetail[]);
}
