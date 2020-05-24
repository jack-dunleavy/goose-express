import { NextFunction, Request, Response, Router } from "express";
import { Document, Model } from "mongoose";
interface GooseExpressOptions {
    waitForIndex?: boolean;
}
declare type RouteMiddleware = (req: Request, res: Response, next: NextFunction) => void;
declare class GooseExpress<T extends Model<Document>> {
    private model;
    private waitForIndex;
    private router;
    constructor(model: T, options?: GooseExpressOptions);
    private formatValidationErrorDetail;
    private formatCastErrorDetail;
    private handleValidationErrors;
    private parseQueryFilter;
    private isValidOid;
    createRouter: () => Router;
    get: () => RouteMiddleware[];
    post: () => RouteMiddleware[];
    put: () => RouteMiddleware[];
    patch: () => RouteMiddleware[];
    delete: () => RouteMiddleware[];
}
export default GooseExpress;
