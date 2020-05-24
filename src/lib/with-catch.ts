// Async error handling wrapper (https://strongloop.com/strongblog/async-error-handling-expressjs-es7-promises-generators/)

import { NextFunction, Request, Response } from "express";

// Catches throws within routes and forwards them to the next error handling middleware
const withCatch = (
  fn: Function
): ((req: Request, res: Response, next: NextFunction) => void) => (
  ...args: [Request, Response, NextFunction]
) => fn(...args).catch(args[2]);

export default withCatch;
