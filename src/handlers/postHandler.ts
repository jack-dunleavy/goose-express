import { NextFunction, Request, Response } from "express";
import { Document, Model } from "mongoose";
import { GooseExpressOptions } from "..";
import { badRequestErrors } from "../lib/error-messages";
import { BadRequestError } from "../lib/errors";
import Path from "../lib/Path";
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

  /**
   * Create new document in collection
   */
  if (path.pathSegments.length === 0) {
    const document = new model(req.body);

    await handleValidationErrors(() => document.validate());
    await document.save();
    return res.status(201).json({ data: document });
  }

  /**
   * Cannot POST to a specified document
   */
  if (path.pathSegments.length === 1) {
    throw new BadRequestError(badRequestErrors.methodInvalid("POST"));
  }

  /**
   * Push subdocument into nested array
   */
  const updated = await handleValidationErrors(() =>
    model.findOneAndUpdate(
      { _id: path.pathSegments[0] },
      {
        $push: { [path.arrayFilterSearchPath]: req.body },
      },
      {
        new: true,
        runValidators: true,
        lean: true,
        arrayFilters: path.arrayFilters,
      }
    )
  );
  return res.status(201).json({ data: updated });
};
