
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { performance } = require("node:perf_hooks");

const {
  validateConfig,
  getBaseUrl,
  getAccessToken,
  getTokenSource,
  getTimestamp,
  generatePassword
} = require("./mpesa");

const app = express();

const PORT = Number(process.env.PORT) || 3000;

// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------

app.use(cors());
app.use(express.json());

// --------------------------------------------------
// CHECK ENVIRONMENT ON STARTUP
// --------------------------------------------------

try {
  const config = validateConfig();

  console.log(
    `M-Pesa environment: ${config.environment}`
  );

  if (config.environment === "production") {
    console.warn(
      "WARNING: Running in PRODUCTION mode"
    );
  }

} catch (error) {
  console.error(
    "Configuration warning:",
    error.message
  );
}

// --------------------------------------------------
// ROOT ENDPOINT
// --------------------------------------------------

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Daraja OAuth API is running",
    project: "Week 9 Day 1 Assignment",
    endpoints: [
      "GET /api/health",
      "GET /api/mpesa/token",
      "GET /api/mpesa/test-password",
      "GET /api/mpesa/health"
    ]
  });
});

// --------------------------------------------------
// TASK 2: CONFIGURATION HEALTH CHECK
// --------------------------------------------------

app.get("/api/health", (req, res) => {
  try {
    const config = validateConfig();

    res.status(200).json({
      status: "ok",
      mpesa_configured: true,
      environment: config.environment,
      shortcode: config.shortcode
    });

  } catch (error) {
    res.status(503).json({
      status: "error",
      mpesa_configured: false,
      error: error.message
    });
  }
});

// --------------------------------------------------
// TASK 1: TEST OAUTH TOKEN
// --------------------------------------------------

app.get("/api/mpesa/token", async (req, res) => {
  const start = performance.now();

  try {
    const token = await getAccessToken();

    const elapsed = Math.round(
      performance.now() - start
    );

    const source = getTokenSource();

    res.status(200).json({
      success: true,

      // Show only part of token for security.
      token_preview: `${token.slice(0, 12)}...`,

      fetch_time_ms: elapsed,

      message:
        source === "cache"
          ? "Token returned from cache (fast)"
          : "Token fetched from Daraja (network request)"
    });

  } catch (error) {
    res.status(502).json({
      success: false,
      error: error.message
    });
  }
});

// --------------------------------------------------
// TASK 3: TIMESTAMP AND PASSWORD TEST
// --------------------------------------------------

app.get("/api/mpesa/test-password", (req, res) => {
  try {
    // Generate timestamp once.
    const timestamp = getTimestamp();

    // Use SAME timestamp for the password.
    const password = generatePassword(timestamp);

    // Run basic checks on the generated data.
    const validTimestamp = /^\d{14}$/.test(timestamp);

    const validBase64 =
      /^[A-Za-z0-9+/]+={0,2}$/.test(password) &&
      Buffer.from(password, "base64")
        .toString("base64") === password;

    res.status(200).json({
      timestamp,

      // Preview instead of exposing full credentials.
      password_preview: `${password.slice(0, 20)}...`,

      password_length: password.length,

      tests_passed: validTimestamp && validBase64
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// --------------------------------------------------
// BONUS: DARAJA API CONNECTIVITY CHECK
// --------------------------------------------------

async function checkDarajaHealth() {
  const start = performance.now();

  try {
    // Forces OAuth verification if no valid token is cached.
    // For real connectivity testing, the cache is bypassed
    // in the bonus implementation shown below.
    const axios = require("axios");
    const { getBase64Credentials } = require("./mpesa");

    const baseUrl = getBaseUrl();

    const response = await axios.get(
      `${baseUrl}/oauth/v1/generate`,
      {
        params: {
          grant_type: "client_credentials"
        },
        headers: {
          Authorization:
            `Basic ${getBase64Credentials()}`
        },
        timeout: 10000
      }
    );

    const elapsed = Math.round(
      performance.now() - start
    );

    return {
      reachable: true,
      response_time_ms: elapsed,
      token_valid: Boolean(
        response.data.access_token
      )
    };

  } catch (error) {
    const elapsed = Math.round(
      performance.now() - start
    );

    return {
      reachable: false,
      response_time_ms: elapsed,
      token_valid: false,
      error:
        error.code === "ECONNABORTED"
          ? "Connection timed out"
          : error.response
            ? `HTTP ${error.response.status}: ` +
              "Daraja OAuth request failed"
            : `Connection failed: ${error.message}`
    };
  }
}

app.get("/api/mpesa/health", async (req, res) => {
  const result = await checkDarajaHealth();

  res.status(result.reachable ? 200 : 503).json(
    result
  );
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );

  console.log(
    `Health endpoint: http://localhost:${PORT}/api/health`
  );
});
