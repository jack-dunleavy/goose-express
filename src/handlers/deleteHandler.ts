import { NextFunction, Request, Response } from "express";
import { Document, Model, Types } from "mongoose";
import {
  badRequestDetail,
  badRequestErrors,
  notFoundErrors,
} from "../lib/error-messages";
import { BadRequestError, NotFoundError } from "../lib/errors";
import parseQuery from "../lib/parse-query";
import Path from "../lib/Path";
import { isValidOid } from "../lib/utils";

export default (model: Model<Document>) => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { query } = parseQuery(req.query);

  const path = new Path(req.path, true);

  /**
   * Broad stroke deletion, delete documents in collection by query
   */
  if (path.pathSegments.length === 0) {
    if (!query) {
      throw new BadRequestError(
        badRequestErrors.queryParameterRequired("query"),
        badRequestDetail.queryParameterRequired("query")
      );
    }

    const result = await model.deleteMany(query);

    res.status(200).json({ data: result });
  }

  /**
   * Path parameter 0 must be a valid OID
   */
  if (!isValidOid(path.pathSegments[0])) {
    throw new NotFoundError(notFoundErrors.idInvalid(path.pathSegments[0]));
  }

  /**
   * Delete the whole document
   */
  if (path.pathSegments.length === 1) {
    const doc = await model.findByIdAndDelete(path.pathSegments[0]);

    if (!doc) {
      throw new NotFoundError(notFoundErrors.idNotFound(path.pathSegments[0]));
    }

    return res.sendStatus(204);
  }

  /**
   * Nested Deletion (delete from arrays of subdocuments by specifying ID)
   */
  const response = await model.findOneAndUpdate(
    { _id: path.pathSegments[0] },
    {
      $pull: {
        [path.arrayFilterSearchPath]: {
          _id: new Types.ObjectId(path.finalPathSegment),
        },
      },
    },
    { new: true, lean: true, arrayFilters: path.arrayFilters }
  );

  return res.json({ data: response });
};
