export class ShiprocketError extends Error {
  public readonly statusCode?: number;
  public readonly providerCode?: string;

  constructor(message: string, statusCode?: number, providerCode?: string) {
    super(message);
    this.name = "ShiprocketError";
    this.statusCode = statusCode;
    this.providerCode = providerCode;
  }
}

export class ShiprocketTimeoutError extends ShiprocketError {
  constructor(message: string = "Shiprocket API request timed out") {
    super(message, 408);
    this.name = "ShiprocketTimeoutError";
  }
}

export class ShiprocketAuthError extends ShiprocketError {
  public readonly status = 401;

  constructor(message: string) {
    super(message, 401);
    this.name = "ShiprocketAuthError";
  }
}

export class ShiprocketRateLimitError extends ShiprocketError {
  public readonly status = 429;

  constructor(message: string) {
    super(message, 429);
    this.name = "ShiprocketRateLimitError";
  }
}

export class ShiprocketNotFoundError extends ShiprocketError {
  public readonly status = 404;

  constructor(message: string) {
    super(message, 404);
    this.name = "ShiprocketNotFoundError";
  }
}

export class ShiprocketApiError extends ShiprocketError {
  public readonly status: number;

  constructor(message: string, status: number = 500) {
    super(message, status);
    this.name = "ShiprocketApiError";
    this.status = status;
  }
}

export class ShiprocketValidationError extends ShiprocketError {
  public readonly field?: string;

  constructor(message: string, options?: { field?: string }) {
    super(message);
    this.name = "ShiprocketValidationError";
    this.field = options?.field;
  }
}

export function normalizeShiprocketError(message: string): string {
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[EMAIL]")
    .replace(/\b(\+?91[-\s.]?)?\d{10}\b/g, "[PHONE]")
    .replace(/\b\d{2,6}\s+[a-zA-Z][\w\s]*\d{1,6}['\u2019]?\b/g, "[ADDRESS]");
}
