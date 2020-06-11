import { NextFunction, Request, Response } from "express";
import { Document, Model } from "mongoose";
import {
  badRequestErrors,
  notFoundErrors,
} from "../../dist/lib/error-messages";
import { BadRequestError, NotFoundError } from "../../dist/lib/errors";
import parseQuery from "../lib/parse-query";
import Path from "../lib/Path";
import { isValidOid } from "../lib/utils";

export default (model: Model<Document>) => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const path = new Path(req.path);
  const documentID = path.pathSegments[0];
  const { query, multiplicity, projection } = parseQuery(req.query);

  /**
   * Collection Level Query
   */
  if (path.pathSegments.length === 0) {
    let response;

    if (multiplicity === "one") {
      response = await model.findOne(query, projection);
    } else {
      response = await model.find(query, projection);
    }

    return res.status(200).json({ data: response });
  }

  /**
   * Query by document ID
   */
  const nests = path.pathSegments.slice(1, path.pathSegments.length);

  if (!isValidOid(path.pathSegments[0])) {
    throw new NotFoundError(notFoundErrors.idInvalid(path.pathSegments[0]));
  }

  const doc = await model.findById(documentID);

  if (!doc) {
    throw new NotFoundError(notFoundErrors.idNotFound(documentID));
  }

  let response = doc.toObject();

  // Recursively search the doc
  // TODO this can probably be more 'Mongo'
  while (nests.length > 0) {
    const pathSegment = nests.shift();

    if (!pathSegment) {
      return;
    }

    if (isValidOid(pathSegment)) {
      response = response.find((subDoc: any) => subDoc._id.equals(pathSegment));

      if (!response) {
        throw new NotFoundError(notFoundErrors.idNotFound(pathSegment));
      }
    } else {
      if (!response[pathSegment]) {
        throw new BadRequestError(badRequestErrors.keyNotFound(pathSegment));
      }
      response = response[pathSegment];
    }
  }

  return res.status(200).json({ data: response });
};
