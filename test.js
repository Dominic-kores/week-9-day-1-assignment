
require("dotenv").config();

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateConfig,
  getBaseUrl,
  getBase64Credentials,
  getTimestamp,
  generatePassword
} = require("./mpesa");

// --------------------------------------------------
// TEST SETUP: MOCK CREDENTIALS
// --------------------------------------------------

// Save original environment so tests can restore it.
const originalEnv = { ...process.env };

function useTestConfig() {
  process.env.MPESA_CONSUMER_KEY = "test_key";
  process.env.MPESA_CONSUMER_SECRET = "test_secret";
  process.env.MPESA_SHORTCODE = "174379";
  process.env.MPESA_PASSKEY = "test_passkey";
  process.env.MPESA_ENV = "sandbox";
}

function restoreConfig() {
  process.env = { ...originalEnv };
}

// --------------------------------------------------
// TEST 1: TIMESTAMP CONTAINS 14 DIGITS
// --------------------------------------------------

test("getTimestamp returns exactly 14 digits", () => {
  const timestamp = getTimestamp();

  assert.match(timestamp, /^\d{14}$/);
});

// --------------------------------------------------
// TEST 2: TIMESTAMP STARTS WITH CURRENT YEAR
// --------------------------------------------------

test("getTimestamp starts with the current year", () => {
  const timestamp = getTimestamp();

  const currentYear = new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: "Africa/Nairobi",
      year: "numeric"
    }
  ).format(new Date());

  assert.ok(timestamp.startsWith(currentYear));
});

// --------------------------------------------------
// TEST 3: PASSWORD GENERATION IS CONSISTENT
// --------------------------------------------------

test("generatePassword returns the same result", () => {
  useTestConfig();

  try {
    const timestamp = "20260503143045";

    const firstPassword = generatePassword(timestamp);
    const secondPassword = generatePassword(timestamp);

    assert.equal(firstPassword, secondPassword);

  } finally {
    restoreConfig();
  }
});

// --------------------------------------------------
// TEST 4: PASSWORD IS VALID BASE64
// --------------------------------------------------

test("generatePassword returns valid Base64", () => {
  useTestConfig();

  try {
    const timestamp = "20260503143045";

    const password = generatePassword(timestamp);

    assert.match(
      password,
      /^[A-Za-z0-9+/]+={0,2}$/
    );

    // Verify decoding produces expected input.
    const decoded = Buffer.from(
      password,
      "base64"
    ).toString("utf8");

    assert.equal(
      decoded,
      "174379test_passkey20260503143045"
    );

  } finally {
    restoreConfig();
  }
});

// --------------------------------------------------
// TEST 5: INVALID TIMESTAMP IS REJECTED
// --------------------------------------------------

test("generatePassword rejects invalid timestamps", () => {
  useTestConfig();

  try {
    assert.throws(
      () => generatePassword("12345"),
      /Timestamp must contain exactly 14 digits/
    );

  } finally {
    restoreConfig();
  }
});

// --------------------------------------------------
// TEST 6: CONFIGURATION VALIDATION
// --------------------------------------------------

test("validateConfig accepts valid configuration", () => {
  useTestConfig();

  try {
    const config = validateConfig();

    assert.equal(config.environment, "sandbox");
    assert.equal(config.shortcode, "174379");

  } finally {
    restoreConfig();
  }
});

// --------------------------------------------------
// TEST 7: MISSING VARIABLES THROW AN ERROR
// --------------------------------------------------

test("validateConfig detects missing credentials", () => {
  useTestConfig();

  try {
    delete process.env.MPESA_CONSUMER_KEY;
    delete process.env.MPESA_PASSKEY;

    assert.throws(
      () => validateConfig(),
      (error) => {
        assert.match(
          error.message,
          /MPESA_CONSUMER_KEY/
        );

        assert.match(
          error.message,
          /MPESA_PASSKEY/
        );

        return true;
      }
    );

  } finally {
    restoreConfig();
  }
});

// --------------------------------------------------
// TEST 8: SANDBOX BASE URL
// --------------------------------------------------

test("getBaseUrl selects sandbox", () => {
  useTestConfig();

  try {
    assert.equal(
      getBaseUrl(),
      "https://sandbox.safaricom.co.ke"
    );

  } finally {
    restoreConfig();
  }
});

// --------------------------------------------------
// TEST 9: PRODUCTION BASE URL
// --------------------------------------------------

test("getBaseUrl selects production", () => {
  useTestConfig();

  try {
    process.env.MPESA_ENV = "production";

    assert.equal(
      getBaseUrl(),
      "https://api.safaricom.co.ke"
    );

  } finally {
    restoreConfig();
  }
});

// --------------------------------------------------
// TEST 10: BASE64 OAUTH CREDENTIALS
// --------------------------------------------------

test("getBase64Credentials encodes key and secret", () => {
  useTestConfig();

  try {
    const encoded = getBase64Credentials();

    assert.equal(
      Buffer.from(encoded, "base64").toString(),
      "test_key:test_secret"
    );

  } finally {
    restoreConfig();
  }
});
