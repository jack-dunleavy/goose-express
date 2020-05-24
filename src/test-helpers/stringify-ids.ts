import cloneDeep from "lodash/cloneDeep";

export const stringifyMongoIDs = (obj: { [key: string]: any }) => {
  const copy = cloneDeep(obj);

  Object.keys(copy).forEach((key) => {
    if (copy[key]._bsontype === "ObjectID") {
      copy[key] = copy[key].toHexString();
    } else if (typeof copy[key] === "object") {
      copy[key] = stringifyMongoIDs(copy[key]);
    }
  });

  return copy;
};
