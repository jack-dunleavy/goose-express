import { badRequestDetail, badRequestErrors } from "./error-messages";
import { BadRequestError } from "./errors";

export const parseJSONQueryParam = (jsonString: string, field: string) => {
  try {
    const parsed = JSON.parse(jsonString);
    return parsed;
  } catch (e) {
    throw new BadRequestError(
      badRequestErrors.parsingQueryParamFailed(field),
      badRequestDetail.parsingQueryParamFailed(field)
    );
  }
};

export const parseQueryFilter = (query: any) => {
  if (typeof query === "string") {
    return parseJSONQueryParam(query, "query");
  }
  return {};
};

export const isValidOid = (oid: string) => {
  return /^[0-9a-fA-F]{24}$/.test(oid);
};
