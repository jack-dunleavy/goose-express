class Path {
  public pathSegments: string[];
  public arrayFilters: {
    [key: string]: string;
  }[];
  private _arrayFilterSearchPath: string[];

  constructor(path: string, omitLastSegment: boolean = false) {
    const pathSegments = this.parsePath(path);
    const finalSegment = omitLastSegment
      ? pathSegments.length - 1
      : pathSegments.length;
    const toProcess = pathSegments.slice(1, finalSegment);
    const arrayFilters: {
      [key: string]: string;
    }[] = [];
    const arrayFilterSearchPath: string[] = [];

    toProcess.forEach((pathSegment) => {
      /**
       * If the current param is an OID it means we must search for the id
       * in the field labelled by the previous param
       */
      if (this.isValidOid(pathSegment)) {
        const arrayField = pathSegments[pathSegments.indexOf(pathSegment) - 1];
        arrayFilters.push({ [`${arrayField}._id`]: pathSegment });
        arrayFilterSearchPath.push(`$[${arrayField}]`);
      } else {
        arrayFilterSearchPath.push(pathSegment);
      }
    });

    this.pathSegments = pathSegments;
    this._arrayFilterSearchPath = arrayFilterSearchPath;
    this.arrayFilters = arrayFilters;
  }

  private isValidOid = (oid: string) => {
    return /^[0-9a-fA-F]{24}$/.test(oid);
  };

  private parsePath = (path: string) => {
    if (path === "/") {
      return [];
    }

    return path.replace(/^\//, "").replace(/\/$/, "").split("/");
  };

  get arrayFilterSearchPath() {
    return this._arrayFilterSearchPath.join(".");
  }

  get finalPathSegment() {
    return this.pathSegments[this.pathSegments.length - 1];
  }

  get targetIsSubDoc() {
    return this.isValidOid(this.pathSegments[this.pathSegments.length - 1]);
  }
}

export default Path;
