export const isValidOid = (oid: string) => {
  return /^[0-9a-fA-F]{24}$/.test(oid);
};
