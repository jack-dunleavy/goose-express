import { NextFunction, Request, Response, Router } from "express";
import { Document, Model } from "mongoose";
import deleteHandler from "./handlers/deleteHandler";
import getHandler from "./handlers/getHandler";
import patchHandler from "./handlers/patchHandler";
import postHandler from "./handlers/postHandler";
import putHandler from "./handlers/putHandler";
import withCatch from "./lib/with-catch";

export interface GooseExpressOptions {
  waitForIndex?: boolean; // Allow time to create the collection indices when creating documents
}

type RouteMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

class GooseExpress<T extends Model<Document>> {
  private model: T;
  private waitForIndex: boolean;
  private router: Router;

  constructor(model: T, options: GooseExpressOptions = {}) {
    this.model = model;
    this.waitForIndex = options.waitForIndex || false;
    this.router = Router();
  }

  public createRouter = () => {
    this.router.get("/*", this.get());
    this.router.post("/*", this.post());
    this.router.delete("/*", this.delete());
    this.router.put("/*", this.put());
    this.router.patch("/*", this.patch());

    return this.router;
  };

  public get = (): RouteMiddleware[] => [withCatch(getHandler(this.model))];

  public post = (): RouteMiddleware[] => [
    withCatch(postHandler(this.model, { waitForIndex: this.waitForIndex })),
  ];

  public put = (): RouteMiddleware[] => [
    withCatch(putHandler(this.model, { waitForIndex: this.waitForIndex })),
  ];

  public patch = (): RouteMiddleware[] => [withCatch(patchHandler(this.model))];

  public delete = (): RouteMiddleware[] => [
    withCatch(deleteHandler(this.model)),
  ];
}

export default GooseExpress;
