export const getId = (obj: { _id?: string; id?: string } | null | undefined): string | undefined =>
  obj ? (obj._id ?? obj.id) : undefined;