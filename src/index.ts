import { NextFunction, Request, Response, Router } from "express";
import { Document, Model, Types } from "mongoose";
import {
  badRequestDetail,
  badRequestErrors,
  ErrorDetail,
  notFoundErrors,
} from "./lib/error-messages";
import { BadRequestError, InternalError, NotFoundError } from "./lib/errors";
import Path from "./lib/Path";
import { parseJSONQueryParam } from "./lib/utils";
import withCatch from "./lib/with-catch";

interface GooseExpressOptions {
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

  private formatValidationErrorDetail = (e: any): ErrorDetail[] | any => {
    let formattedErrors;

    const errorDetail = e.errors;

    formattedErrors = Object.keys(errorDetail).map((error) => {
      if (errorDetail[error].errors) {
        const nestedDetail = errorDetail[error].errors;

        return Object.keys(nestedDetail).map((nestedError) => {
          return {
            msg: nestedDetail[nestedError].message,
            path: `${error}.*.${nestedError}`,
            location: "body",
          };
        });
      }
      return {
        msg: errorDetail[error].message,
        path: error,
        location: "body",
      };
    });

    // @ts-ignore
    return formattedErrors.flat();
  };

  private formatCastErrorDetail = (e: any): ErrorDetail[] | any => {
    return [
      {
        msg: e.message,
        path: e.path,
        location: "body",
      },
    ];
  };

  private handleValidationErrors = async (fn: any) => {
    try {
      const res = await fn();
      return res;
    } catch (e) {
      if (e.name === "ValidationError") {
        throw new BadRequestError(
          badRequestErrors.validationFailed,
          this.formatValidationErrorDetail(e)
        );
      } else if (e.name === "CastError") {
        throw new BadRequestError(
          badRequestErrors.validationFailed,
          this.formatCastErrorDetail(e)
        );
      } else {
        throw new InternalError(e);
      }
    }
  };

  private parseQueryFilter = (query: any) => {
    if (typeof query === "string") {
      return parseJSONQueryParam(query, "query");
    }
    return {};
  };

  private isValidOid = (oid: string) => {
    return /^[0-9a-fA-F]{24}$/.test(oid);
  };

  public createRouter = () => {
    this.router.get("/*", this.get());
    this.router.post("/*", this.post());
    this.router.delete("/*", this.delete());
    this.router.put("/*", this.put());
    this.router.patch("/*", this.patch());

    return this.router;
  };

  public get = (): RouteMiddleware[] => [
    withCatch(async (req: Request, res: Response, next: NextFunction) => {
      const path = new Path(req.path);
      const documentID = path.pathSegments[0];
      const { fields, multiplicity } = req.query;
      let mongoQuery = this.parseQueryFilter(req.query.query);
      let projection: string[] = [];

      if (typeof fields === "string") {
        projection = parseJSONQueryParam(fields, "fields").filter(
          (n: any) => typeof n === "string"
        );

        const inclusions = projection.filter(
          (field) => !field.startsWith("-") && field !== "_id"
        );
        const exclusions = projection.filter(
          (field) => field.startsWith("-") && field !== "-_id"
        );

        if (inclusions.length > 0 && exclusions.length > 0) {
          throw new BadRequestError(
            badRequestErrors.projectionInvalid,
            badRequestDetail.projectionInvalid
          );
        }
      }

      /**
       * Collection Level Query
       */
      if (path.pathSegments.length === 0) {
        let response;

        if (multiplicity === "one") {
          response = await this.model.findOne(mongoQuery, projection);
        } else {
          response = await this.model.find(mongoQuery, projection);
        }

        return res.status(200).json({ data: response });
      }

      /**
       * Query by document ID
       */
      const nests = path.pathSegments.slice(1, path.pathSegments.length);

      if (!this.isValidOid(path.pathSegments[0])) {
        throw new NotFoundError(notFoundErrors.idInvalid(path.pathSegments[0]));
      }

      const doc = await this.model.findById(documentID);

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

        if (this.isValidOid(pathSegment)) {
          response = response.find((subDoc: any) =>
            subDoc._id.equals(pathSegment)
          );

          if (!response) {
            throw new NotFoundError(notFoundErrors.idNotFound(pathSegment));
          }
        } else {
          if (!response[pathSegment]) {
            throw new BadRequestError(
              badRequestErrors.keyNotFound(pathSegment)
            );
          }
          response = response[pathSegment];
        }
      }

      return res.status(200).json({ data: response });
    }),
  ];

  public post = (): RouteMiddleware[] => [
    withCatch(async (req: Request, res: Response) => {
      if (this.waitForIndex) {
        await this.model.init();
      }

      const path = new Path(req.path);

      /**
       * Create new document in collection
       */
      if (path.pathSegments.length === 0) {
        const document = new this.model(req.body);

        await this.handleValidationErrors(() => document.validate());
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
      const updated = await this.handleValidationErrors(() =>
        this.model.findOneAndUpdate(
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
    }),
  ];

  public put = (): RouteMiddleware[] => [
    withCatch(async (req: Request, res: Response) => {
      if (this.waitForIndex) {
        await this.model.init();
      }

      const path = new Path(req.path);

      if (!path.pathSegments[0] || !this.isValidOid(path.pathSegments[0])) {
        throw new BadRequestError(
          notFoundErrors.idInvalid(path.pathSegments[0])
        );
      }

      /**
       * Upsert the document specified by the first path parameter (the ID)
       */
      if (path.pathSegments.length === 1) {
        const updateResult = await this.handleValidationErrors(() =>
          this.model.findByIdAndUpdate(path.pathSegments[0], req.body, {
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
      const result = await this.model.findOneAndUpdate(
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
    }),
  ];

  public patch = (): RouteMiddleware[] => [
    withCatch(async (req: Request, res: Response) => {
      const { query, multiplicity } = req.query;
      let mongoQuery = {};

      const path = new Path(req.path);

      if (path.pathSegments.length === 0) {
        if (typeof query === "string") {
          mongoQuery = parseJSONQueryParam(query, "query");
        }

        let updateResult;
        if (multiplicity === "one") {
          updateResult = await this.model.findOneAndUpdate(
            mongoQuery,
            req.body,
            { lean: true, new: true }
          );
        } else {
          updateResult = await this.model.updateMany(mongoQuery, req.body, {
            lean: true,
          });
        }

        return res.status(200).json({ data: updateResult });
      }

      if (!path.pathSegments[0] || !this.isValidOid(path.pathSegments[0])) {
        throw new BadRequestError(
          notFoundErrors.idInvalid(path.pathSegments[0])
        );
      }

      if (path.pathSegments.length === 1) {
        const updateResult = await this.handleValidationErrors(() =>
          this.model.findByIdAndUpdate(
            path.pathSegments[0],
            { $set: req.body },
            { lean: true, upsert: false, new: true, runValidators: true }
          )
        );

        if (!updateResult) {
          throw new NotFoundError(
            notFoundErrors.idNotFound(path.pathSegments[0])
          );
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

      const updated = await this.handleValidationErrors(() =>
        this.model.findByIdAndUpdate(
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
    }),
  ];

  public delete = (): RouteMiddleware[] => [
    withCatch(async (req: Request, res: Response) => {
      const { query } = req.query;
      let mongoQuery;

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

        if (typeof query === "string") {
          mongoQuery = parseJSONQueryParam(query, "query");
        }

        const result = await this.model.deleteMany(mongoQuery);

        res.status(200).json({ data: result });
      }

      /**
       * Path parameter 0 must be a valid OID
       */
      if (!this.isValidOid(path.pathSegments[0])) {
        throw new NotFoundError(notFoundErrors.idInvalid(path.pathSegments[0]));
      }

      /**
       * Delete the whole document
       */
      if (path.pathSegments.length === 1) {
        const doc = await this.model.findByIdAndDelete(path.pathSegments[0]);

        if (!doc) {
          throw new NotFoundError(
            notFoundErrors.idNotFound(path.pathSegments[0])
          );
        }

        return res.sendStatus(204);
      }

      /**
       * Nested Deletion (delete from arrays of subdocuments by specifying ID)
       */
      const response = await this.model.findOneAndUpdate(
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
    }),
  ];
}

export default GooseExpress;
