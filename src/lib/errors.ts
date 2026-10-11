export type ErrorKind = "forbidden" | "missing" | "exists" | "invalid" | "network" | "unknown";

/** A database error sorted into the few cases the app explains to people. */
export class AppError extends Error {
  constructor(
    public kind: ErrorKind,
    message: string,
  ) {
    super(message);
  }
}
