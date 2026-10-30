
# Week 9 – Day 1: Daraja OAuth & Setup

## Project Overview

This project demonstrates how to integrate Safaricom's
M-Pesa Daraja API into a Node.js and Express backend.

The application implements OAuth 2.0 authentication,
environment configuration, token caching, timestamp
generation, STK Push password encoding, and API testing.

## Learning Objectives

- Understand M-Pesa Daraja authentication.
- Implement OAuth 2.0 Client Credentials flow.
- Generate Base64-encoded credentials.
- Implement access token caching and expiry checks.
- Secure API credentials using environment variables.
- Generate M-Pesa timestamps and passwords.
- Test API endpoints using Thunder Client and cURL.
- Write automated unit tests.
- Implement an API connectivity health checker.

## Technologies Used

- Node.js
- Express.js
- Axios
- Dotenv
- CORS
- Nodemon
- Node.js Test Runner
- Safaricom Daraja API
- Thunder Client

## Project Structure

week-9-day-1-assignment/
├── server.js
├── mpesa.js
├── test.js
├── .env.example
├── .gitignore
├── package.json
└── README.md

## Installation

Clone the repository:

git clone https://github.com/Dominic-kores/week-9-day-1-assignment

cd week-9-day-1-assignment

Install dependencies:

npm install

Create a .env file using .env.example.

Add your own Safaricom Daraja sandbox credentials.

## Environment Variables

MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
MPESA_ENV=sandbox
PORT=3000

Never commit your .env file to GitHub.

## Running the Application

Start the development server:

npm run dev

Server URL:

http://localhost:3000

## API Endpoints

### 1. Configuration Health

GET /api/health

Returns:
- status
- mpesa_configured
- environment
- shortcode

Example:

curl http://localhost:3000/api/health

### 2. OAuth Token

GET /api/mpesa/token

Fetches an OAuth access token from Daraja.

Uses an in-memory cache to avoid unnecessary
requests until the token approaches expiry.

Example:

curl http://localhost:3000/api/mpesa/token

First request: network token fetch.
Second request: cached token.

### 3. Password Generator

GET /api/mpesa/test-password

Returns:
- timestamp
- password_preview
- password_length
- tests_passed

Example:

curl http://localhost:3000/api/mpesa/test-password

### 4. Daraja Health Checker

GET /api/mpesa/health

Tests connectivity with the Daraja OAuth API.

Example:

curl http://localhost:3000/api/mpesa/health

Sample successful response:

{
  "reachable": true,
  "response_time_ms": 245,
  "token_valid": true
}

## Unit Testing

Run:

npm test

The unit tests verify:

1. Timestamp contains exactly 14 digits.
2. Timestamp starts with the current year.
3. Password generation is deterministic.
4. Password output is valid Base64.
5. Invalid timestamps are rejected.
6. Valid environment configuration is accepted.
7. Missing credentials are detected.
8. Sandbox URL is correct.
9. Production URL is correct.
10. OAuth credentials encode correctly.

## Security Features

- Credentials stored in environment variables.
- Sensitive files excluded with .gitignore.
- OAuth tokens cached with expiry checking.
- Token expiry buffer implemented.
- Errors handled with descriptive messages.
- Passwords generated using Base64.
- Token and password previews used for local testing.
- Sandbox and production environments separated.

Note: Diagnostic endpoints are for local development.
They must be protected or disabled in production.

## Screenshots

Add screenshots showing:

1. Running Express server
2. Successful configuration health check
3. Initial OAuth token response
4. Cached OAuth token response
5. Timestamp/password response
6. Passing unit tests
7. Daraja API health check

## Future Improvements

- Implement STK Push payments.
- Receive M-Pesa transaction callbacks.
- Store transactions in PostgreSQL.
- Add payment status verification.
- Add authentication for protected endpoints.
- Deploy the backend to Railway.

## Author

Dominic Kores

Full-Stack Software & AI Engineer

Live Pages: https://dominic-kores.github.io/week-9-day-1-assignment

