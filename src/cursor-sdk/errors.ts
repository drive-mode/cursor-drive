/**
 * ACP/Drive request error hierarchy.
 * Used when ACP RPCs fail or when permission requests are denied.
 */

export class AcpRequestError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AcpRequestError";
    Object.setPrototypeOf(this, AcpRequestError.prototype);
  }
}
