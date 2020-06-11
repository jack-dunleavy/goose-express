import QueryString from "qs";
import {
  badRequestDetail,
  badRequestErrors,
} from "../../dist/lib/error-messages";
import { BadRequestError } from "../../dist/lib/errors";
import { parseJSONQueryParam } from "./utils";

type QueryParam =
  | string
  | QueryString.ParsedQs
  | string[]
  | QueryString.ParsedQs[];

const parseQuery = (query: { [key: string]: QueryParam }) => {
  let queryFilter = undefined;
  let projection = undefined;
  let multiplicity = query.multiplicity;

  if (query.query && typeof query.query === "string") {
    queryFilter = parseJSONQueryParam(query.query, "query");
  }

  if (query.fields && typeof query.fields === "string") {
    projection = parseJSONQueryParam(query.fields, "fields").filter(
      (n: any) => typeof n === "string"
    );

    const inclusions = projection.filter(
      (field: string) => !field.startsWith("-") && field !== "_id"
    );
    const exclusions = projection.filter(
      (field: string) => field.startsWith("-") && field !== "-_id"
    );

    if (inclusions.length > 0 && exclusions.length > 0) {
      throw new BadRequestError(
        badRequestErrors.projectionInvalid,
        badRequestDetail.projectionInvalid
      );
    }
  }

  return {
    query: queryFilter,
    projection: projection,
    multiplicity: multiplicity,
  };
};

export default parseQuery;
