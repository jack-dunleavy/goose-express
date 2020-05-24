export interface ErrorDetail {
  msg: string;
  param?: string;
  location?: string;
}

export class CustomError extends Error {
  public reason: string;
  public code: number;
  public detail: ErrorDetail[];
}

export class BadRequestError extends CustomError {
  constructor(message: string, detail?: ErrorDetail[]) {
    super(message);
    this.reason = "Bad Request";
    this.code = 400;
    this.detail = detail ? detail : [];
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string) {
    super(message);
    this.reason = "Not Found";
    this.code = 404;
  }
}

export class InternalError extends CustomError {
  constructor(message: string, detail?: ErrorDetail[]) {
    super(message);
    this.reason = "Server Error";
    this.code = 500;
    this.detail = detail ? detail : [];
  }
}
