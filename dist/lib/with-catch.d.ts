import { NextFunction, Request, Response } from "express";
declare const withCatch: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export default withCatch;
