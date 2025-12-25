const https = require("https");
const { URL } = require("url");

class AsanakSms {
  constructor({ username, password, srcAddress, debug = false } = {}) {
    this.username = username || process.env.ASANAK_USERNAME;
    this.password = password || process.env.ASANAK_PASSWORD;
    this.srcAddress = srcAddress || process.env.ASANAK_SOURCE_NUMBER;
    this.url =
      process.env.ASANAK_WEBSERVICE ||
      "https://smsapi.asanak.ir/services/CompositeSmsGateway?wsdl";
    this.debug = debug;

    if (!this.username || !this.password || !this.srcAddress) {
      throw new Error(
        "AsanakSms: username, password, and srcAddress are required"
      );
    }

    if (this.debug) {
      const urlObj = new URL(this.url);
      console.log("[AsanakSms:init]");
      console.log("  endpoint:", `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`);
      console.log("  srcAddress:", this.srcAddress);
      console.log("  debug:", this.debug);
    }
  }

  buildXml(destAddress, message) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
                   xmlns:ns1="http://webService.compositeSmsGateway.services.sdp.peykasa.com/">
  <SOAP-ENV:Body>
    <ns1:sendSms>
      <userCredential>
        <username>${this.username}</username>
        <password>${this.password}</password>
      </userCredential>
      <srcAddresses>${this.srcAddress}</srcAddresses>
      <destAddresses>${destAddress}</destAddresses>
      <msgBody>${message}</msgBody>
      <msgEncoding>8</msgEncoding>
    </ns1:sendSms>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
  }

  parseSoapFault(xml) {
    if (typeof xml !== "string") return null;
    if (!/<soap:Fault/i.test(xml)) return null;

    const faultCode =
      xml.match(/<faultcode>(.*?)<\/faultcode>/i)?.[1] || "UNKNOWN";
    const faultString =
      xml.match(/<faultstring>(.*?)<\/faultstring>/i)?.[1] ||
      "Unknown SOAP fault";

    return {
      code: faultCode,
      message: faultString
    };
  }

  maskPhone(phone) {
    if (!phone || phone.length < 6) return "***";
    return `${phone.slice(0, 3)}***${phone.slice(-3)}`;
  }

  send(destAddress, message) {
    if (!destAddress) {
      return Promise.reject(
        new Error("AsanakSms.send: destAddress is required")
      );
    }

    if (!message) {
      return Promise.reject(
        new Error("AsanakSms.send: message is required")
      );
    }

    const xml = this.buildXml(destAddress, message);
    const urlObj = new URL(this.url);
    const startTime = Date.now();

    if (this.debug) {
      console.log("[AsanakSms:send:start]");
      console.log("  to:", this.maskPhone(destAddress));
      console.log("  messageLength:", message.length);
      console.log("  payloadBytes:", Buffer.byteLength(xml));
    }

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Content-Length": Buffer.byteLength(xml),
        SOAPAction: ""
      },
      timeout: 20000
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseBody = "";

        if (this.debug) {
          console.log("[AsanakSms:http:response]");
          console.log("  status:", res.statusCode);
          console.log("  headers:", res.headers);
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          const err = new Error(
            `HTTP ${res.statusCode}: ${res.statusMessage || "Request failed"}`
          );

          if (this.debug) {
            console.error("[AsanakSms:http:error]", err.message);
          }

          return reject(err);
        }

        res.on("data", (chunk) => {
          responseBody += chunk;
        });

        res.on("end", () => {
          const duration = Date.now() - startTime;

          if (this.debug) {
            console.log("[AsanakSms:response:end]");
            console.log("  durationMs:", duration);
            console.log("  responseBytes:", Buffer.byteLength(responseBody));
            console.log("  rawXml:", responseBody);
          }

          const soapFault = this.parseSoapFault(responseBody);
          if (soapFault) {
            const err = new Error(soapFault.message);
            err.name = "SoapFaultError";
            err.code = soapFault.code;
            err.response = responseBody;

            if (this.debug) {
              console.error("[AsanakSms:soap:fault]");
              console.error("  code:", soapFault.code);
              console.error("  message:", soapFault.message);
            }

            return reject(err);
          }

          if (this.debug) {
            console.log("[AsanakSms:send:success]");
          }

          resolve(responseBody);
        });
      });

      req.on("error", (err) => {
        if (this.debug) {
          console.error("[AsanakSms:network:error]", err.message);
        }
        reject(err);
      });

      req.on("timeout", () => {
        const err = new Error("Request timed out");

        if (this.debug) {
          console.error("[AsanakSms:timeout]", err.message);
        }

        req.destroy(err);
      });

      req.write(xml);
      req.end();
    });
  }
}

module.exports = AsanakSms;
