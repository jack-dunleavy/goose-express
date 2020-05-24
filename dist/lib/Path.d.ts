declare class Path {
    pathSegments: string[];
    arrayFilters: {
        [key: string]: string;
    }[];
    private _arrayFilterSearchPath;
    constructor(path: string, omitLastSegment?: boolean);
    private isValidOid;
    private parsePath;
    get arrayFilterSearchPath(): string;
    get finalPathSegment(): string;
    get targetIsSubDoc(): boolean;
}
export default Path;
