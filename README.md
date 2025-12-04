# Soap Asanak SMS JavaScript

**SoapAsanakSMSJS** is a Node.js library for sending SMS messages via the Asanak SOAP SMS gateway.

It allows you to send messages with raw SOAP XML and logs both request and response for debugging. Credentials and configuration can be managed through environment variables.

---

## Table of Contents

* [Features](#features)
* [Installation](#installation)
* [Configuration](#configuration)
* [Usage](#usage)
* [Example](#example)
* [License](#license)

---

## Features

* Simple, reusable Node.js library for Asanak SOAP SMS gateway
* Supports credentials from environment variables (`.env`)
* Logs raw XML request and response for debugging
* Configurable source number and SOAP web service URL
* Built using `axios` for HTTP requests

---

## Installation

```bash
npm install soap-asanak-sms
```

Or clone the repository:

```bash
git clone https://github.com/BaseMax/SoapAsanakSMSJS.git
cd SoapAsanakSMSJS
npm install
```

---

## Configuration

Create a `.env` file in your project root:

```env
ASANAK_USERNAME=your_username
ASANAK_PASSWORD=your_password
ASANAK_SOURCE_NUMBER=982175181
ASANAK_WEBSERVICE=https://smsapi.asanak.ir/services/CompositeSmsGateway?wsdl
```

The library will automatically load `.env` from the current folder or parent directory.

---

## Usage

### Using

```javascript
const AsanakSms = require("soap-asanak-sms");

const sms = new AsanakSms({});
```

### Import and Initialize

```javascript
const AsanakSms = require("./lib/AsanakSms");

const sms = new AsanakSms({});
```

### Sending an SMS

```javascript
(async () => {
  try {
    const response = await sms.send("989121111010", "سلام - این یک پیام تست است");
    console.log("Response:", response);
  } catch (err) {
    console.error("Failed to send SMS:", err.message);
  }
})();
```

**Notes:**

* `send(destAddress, message)` sends a single SMS.
* Logs will display raw request XML, response headers, and raw response XML.

---

## Project Structure

```
SoapAsanakSMSJS/
├── lib/
│   └── AsanakSms.js       # Main library
├── tests/                 # Test scripts
├── .env                   # Environment variables
├── package.json
└── README.md
```

---

## License

This project is licensed under the **MIT License**.

Copyright © 2025 Seyyed Ali Mohammadiyeh (Max Base)

[MIT License](https://opensource.org/licenses/MIT)
