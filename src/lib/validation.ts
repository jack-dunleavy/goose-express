import { badRequestErrors, ErrorDetail } from "../../dist/lib/error-messages";
import { BadRequestError, InternalError } from "../../dist/lib/errors";

export const handleValidationErrors = async (fn: any) => {
  try {
    const res = await fn();
    return res;
  } catch (e) {
    if (e.name === "ValidationError") {
      throw new BadRequestError(
        badRequestErrors.validationFailed,
        formatValidationErrorDetail(e)
      );
    } else if (e.name === "CastError") {
      throw new BadRequestError(
        badRequestErrors.validationFailed,
        formatCastErrorDetail(e)
      );
    } else {
      throw new InternalError(e);
    }
  }
};

const formatValidationErrorDetail = (e: any): ErrorDetail[] | any => {
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

const formatCastErrorDetail = (e: any): ErrorDetail[] | any => {
  return [
    {
      msg: e.message,
      path: e.path,
      location: "body",
    },
  ];
};
