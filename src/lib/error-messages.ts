export interface ErrorDetail {
  msg: string;
  param?: string;
  location?: string;
}

const generateErrorDetail = (
  msg: string,
  param?: string,
  location?: string
): ErrorDetail[] => {
  return [
    {
      msg,
      param,
      location,
    },
  ];
};

export const badRequestErrors = {
  validationFailed: "The document provided failed validation",
  queryParameterRequired: (param: string) =>
    `Query pararameter (req.query.${param}) provided is required`,
  parsingQueryParamFailed: (param: string) =>
    `Query pararameter (req.query.${param}) provided is invalid. Error parsing JSON contents`,
  projectionInvalid:
    "Query parameter (req.query.fields is invalid. Cannot both include and exclude in a Mongo projection",
  keyNotFound: (key: string) =>
    `The requested key: ${key} does not exist on this document`,
  methodInvalid: (method: string) => `Cannot ${method} to the route specified`,
  missingUpdate:
    "PUT requests on nested fields must contain the 'update' field",
};

export const badRequestDetail = {
  parsingQueryParamFailed: (param: string) =>
    generateErrorDetail(`Invalid value for ${param}`, param, "query"),
  queryParameterRequired: (param: string) =>
    generateErrorDetail(`Query parameter ${param} is required`, param, "query"),
  projectionInvalid: generateErrorDetail(
    "Invalid value for fields - cannot use inclusions and exclusions in the same query",
    "fields",
    "query"
  ),
};

export const notFoundErrors = {
  idNotFound: (id: string) =>
    `The resource specified by ID: ${id} was not found`,
  idInvalid: (id: string) => `The ID provided: ${id} is not a valid mongo id`,
};
