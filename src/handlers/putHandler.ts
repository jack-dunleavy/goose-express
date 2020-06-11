import { NextFunction, Request, Response } from "express";
import { Document, Model } from "mongoose";
import { GooseExpressOptions } from "..";
import { notFoundErrors } from "../lib/error-messages";
import { BadRequestError } from "../lib/errors";
import parseQuery from "../lib/parse-query";
import Path from "../lib/Path";
import { isValidOid } from "../lib/utils";
import { handleValidationErrors } from "../lib/validation";

export default (model: Model<Document>, options: GooseExpressOptions) => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (options.waitForIndex) {
    await model.init();
  }

  const path = new Path(req.path);
  const { query } = parseQuery(req.query);

  /**
   * Update the document located using the query
   */
  if (path.pathSegments.length === 0 && query) {
    const updateResult = await handleValidationErrors(() =>
      model.findOneAndUpdate(query, req.body, {
        // @ts-ignore - overwrite isn't included in the declaration unfortunately
        overwrite: true,
        new: true,
        lean: true,
        runValidators: true,
      })
    );

    return res.status(200).json({ data: updateResult });
  }

  /**
   * Cannot PUT to `collection` or `collection/key` PUT requests
   * must specify either a valid document ID or provide a query
   * to locate the target document for update
   */
  if (path.pathSegments.length === 0 || !isValidOid(path.pathSegments[0])) {
    throw new BadRequestError(notFoundErrors.idInvalid(path.pathSegments[0]));
  }

  /**
   * Upsert the document specified by the first path parameter (the ID)
   */
  if (path.pathSegments.length === 1) {
    const updateResult = await handleValidationErrors(() =>
      model.findByIdAndUpdate(path.pathSegments[0], req.body, {
        // @ts-ignore - overwrite isn't included in the declaration unfortunately
        overwrite: true,
        upsert: true,
        new: true,
        lean: true,
        runValidators: true,
      })
    );

    return res.status(200).json({ data: updateResult });
  }

  /**
   * Updates on nested sections of the document
   */
  const result = await model.findOneAndUpdate(
    { _id: path.pathSegments[0] },
    {
      $set: {
        [path.arrayFilterSearchPath]: {
          ...req.body,
          _id: path.pathSegments[path.pathSegments.length - 1],
        },
      },
    },
    {
      new: true,
      lean: true,
      arrayFilters: path.arrayFilters,
    }
  );

  return res.status(200).json({ data: result });
};
