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
