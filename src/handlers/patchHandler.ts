import { NextFunction, Request, Response } from "express";
import { Document, Model } from "mongoose";
import { notFoundErrors } from "../lib/error-messages";
import { BadRequestError, NotFoundError } from "../lib/errors";
import parseQuery from "../lib/parse-query";
import Path from "../lib/Path";
import { isValidOid } from "../lib/utils";
import { handleValidationErrors } from "../lib/validation";

export default (model: Model<Document>) => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { query, multiplicity } = parseQuery(req.query);
  const path = new Path(req.path);

  if (path.pathSegments.length === 0) {
    let updateResult;
    if (multiplicity === "one") {
      updateResult = await model.findOneAndUpdate(query, req.body, {
        lean: true,
        new: true,
      });
    } else {
      updateResult = await model.updateMany(query, req.body, {
        lean: true,
      });
    }

    return res.status(200).json({ data: updateResult });
  }

  if (!path.pathSegments[0] || !isValidOid(path.pathSegments[0])) {
    throw new BadRequestError(notFoundErrors.idInvalid(path.pathSegments[0]));
  }

  if (path.pathSegments.length === 1) {
    const updateResult = await handleValidationErrors(() =>
      model.findByIdAndUpdate(
        path.pathSegments[0],
        { $set: req.body },
        { lean: true, upsert: false, new: true, runValidators: true }
      )
    );

    if (!updateResult) {
      throw new NotFoundError(notFoundErrors.idNotFound(path.pathSegments[0]));
    }
    return res.status(200).json({ data: updateResult });
  }

  /**
   * If the target is a subdoc we map the req body into an object containing
   * specific keys on the target sub-document to replace:
   *
   * {
   *   document.nest.[$arrayFilter].field: newValue
   *   document.nest.[$arrayFilter].field2: newValue2
   * }
   *
   * Otherwise we replace the target with the value of req.body.update (single field)
   */
  const updateBody = path.targetIsSubDoc
    ? Object.fromEntries(
        Object.entries(req.body).map((entry) => {
          return [[`${path.arrayFilterSearchPath}.${entry[0]}`], entry[1]];
        })
      )
    : { [path.arrayFilterSearchPath]: req.body.update };

  const updated = await handleValidationErrors(() =>
    model.findByIdAndUpdate(
      path.pathSegments[0],
      {
        $set: updateBody,
      },
      {
        new: true,
        lean: true,
        arrayFilters: path.arrayFilters,
        runValidators: true,
      }
    )
  );

  return res.status(200).json({ data: updated });
};
