
const axios = require("axios");

// --------------------------------------------------
// 1. TOKEN CACHE
// --------------------------------------------------

// These variables remember the last successful token.
let cachedToken = null;
let tokenExpiry = 0;

// Prevents simultaneous requests from fetching
// multiple OAuth tokens.
let pendingTokenRequest = null;

// Store details of the last successful token request.
let lastTokenSource = null;

// --------------------------------------------------
// 2. VALIDATE ENVIRONMENT CONFIGURATION
// --------------------------------------------------

function validateConfig() {
  const requiredVariables = [
    "MPESA_CONSUMER_KEY",
    "MPESA_CONSUMER_SECRET",
    "MPESA_SHORTCODE",
    "MPESA_PASSKEY",
    "MPESA_ENV"
  ];

  // Find any variables that are missing or empty.
  const missing = requiredVariables.filter((name) => {
    return !process.env[name]?.trim();
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  const environment = process.env.MPESA_ENV.trim();

  if (!["sandbox", "production"].includes(environment)) {
    throw new Error(
      "MPESA_ENV must be either sandbox or production"
    );
  }

  return {
    consumerKey: process.env.MPESA_CONSUMER_KEY.trim(),
    consumerSecret: process.env.MPESA_CONSUMER_SECRET.trim(),
    shortcode: process.env.MPESA_SHORTCODE.trim(),
    passkey: process.env.MPESA_PASSKEY.trim(),
    environment
  };
}

// --------------------------------------------------
// 3. GET DARAJA BASE URL
// --------------------------------------------------

function getBaseUrl() {
  const environment = process.env.MPESA_ENV;

  if (environment === "production") {
    return "https://api.safaricom.co.ke";
  }

  if (environment === "sandbox") {
    return "https://sandbox.safaricom.co.ke";
  }

  throw new Error(
    "Invalid MPESA_ENV. Use sandbox or production."
  );
}

// --------------------------------------------------
// 4. GENERATE BASE64 CREDENTIALS
// --------------------------------------------------

function getBase64Credentials() {
  const { consumerKey, consumerSecret } = validateConfig();

  // Daraja OAuth requires ConsumerKey:ConsumerSecret.
  const credentials = `${consumerKey}:${consumerSecret}`;

  return Buffer.from(credentials).toString("base64");
}

// --------------------------------------------------
// 5. FETCH AND CACHE OAUTH ACCESS TOKEN
// --------------------------------------------------

async function getAccessToken() {
  // Validate configuration before using cached credentials.
  validateConfig();

  const now = Date.now();

  // Return cached token if still valid.
  if (cachedToken && now < tokenExpiry) {
    lastTokenSource = "cache";

    return cachedToken;
  }

  // Reuse an ongoing OAuth request.
  if (pendingTokenRequest) {
    return pendingTokenRequest;
  }

  pendingTokenRequest = (async () => {
    try {
      const baseUrl = getBaseUrl();
      const encoded = getBase64Credentials();

      const url =
        `${baseUrl}/oauth/v1/generate` +
        "?grant_type=client_credentials";

      // Send authenticated GET request to Daraja.
      const response = await axios.get(url, {
        headers: {
          Authorization: `Basic ${encoded}`,
          Accept: "application/json"
        },
        timeout: 10000
      });

      const { access_token, expires_in } = response.data;

      if (!access_token) {
        throw new Error(
          "Daraja response did not contain an access token"
        );
      }

      // Convert the expiry value into seconds.
      const duration = Number(expires_in);

      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error("Invalid token expiry from Daraja");
      }

      // Reserve up to 60 seconds before expiry.
      const bufferSeconds = Math.min(60, duration * 0.1);

      cachedToken = access_token;

      tokenExpiry =
        Date.now() + Math.max(0, duration - bufferSeconds) * 1000;

      lastTokenSource = "network";

      return cachedToken;

    } catch (error) {
      // Clear the cache if authentication fails.
      cachedToken = null;
      tokenExpiry = 0;
      lastTokenSource = null;

      if (error.response) {
        throw new Error(
          `Daraja OAuth HTTP error ${error.response.status}: ` +
          `${error.response.data?.errorMessage ||
             error.response.data?.error ||
             "Authentication failed"}`
        );
      }

      if (error.code === "ECONNABORTED") {
        throw new Error(
          "Daraja OAuth request timed out"
        );
      }

      if (error.code) {
        throw new Error(
          `Daraja network failure: ${error.message}`
        );
      }

      throw error;

    } finally {
      pendingTokenRequest = null;
    }
  })();

  return pendingTokenRequest;
}

// --------------------------------------------------
// 6. GET OAUTH TOKEN SOURCE
// --------------------------------------------------

function getTokenSource() {
  return lastTokenSource;
}

// --------------------------------------------------
// 7. GENERATE M-PESA TIMESTAMP
// --------------------------------------------------

function getTimestamp() {
  // Always use Kenya time, regardless of server location.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const dateParts = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  const pad = (value) =>
    String(value).padStart(2, "0");

  return (
    dateParts.year +
    pad(dateParts.month) +
    pad(dateParts.day) +
    pad(dateParts.hour) +
    pad(dateParts.minute) +
    pad(dateParts.second)
  );
}

// --------------------------------------------------
// 8. GENERATE STK PUSH PASSWORD
// --------------------------------------------------

function generatePassword(timestamp) {
  const { shortcode, passkey } = validateConfig();

  // Validate the required 14-digit timestamp.
  if (!/^\d{14}$/.test(timestamp || "")) {
    throw new Error(
      "Timestamp must contain exactly 14 digits"
    );
  }

  // Concatenate without separators.
  const rawPassword = `${shortcode}${passkey}${timestamp}`;

  // Encode the combined string.
  return Buffer.from(rawPassword).toString("base64");
}

// Export functions for reuse in server.js and tests.
module.exports = {
  validateConfig,
  getBaseUrl,
  getBase64Credentials,
  getAccessToken,
  getTokenSource,
  getTimestamp,
  generatePassword
};
