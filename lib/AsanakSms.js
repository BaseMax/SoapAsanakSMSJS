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

    if (this.debug) {
      console.log("======== RAW REQUEST XML ========");
      console.log(xml);
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
          console.log("======== RESPONSE HEADERS ========");
          console.log(res.headers);
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(
            new Error(
              `HTTP ${res.statusCode}: ${res.statusMessage || "Request failed"}`
            )
          );
        }

        res.on("data", (chunk) => {
          responseBody += chunk;
        });

        res.on("end", () => {
          if (this.debug) {
            console.log("======== RAW RESPONSE XML ========");
            console.log(responseBody);
          }

          const soapFault = this.parseSoapFault(responseBody);
          if (soapFault) {
            const err = new Error(soapFault.message);
            err.name = "SoapFaultError";
            err.code = soapFault.code;
            err.response = responseBody;
            return reject(err);
          }

          resolve(responseBody);
        });
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.on("timeout", () => {
        req.destroy(new Error("Request timed out"));
      });

      req.write(xml);
      req.end();
    });
  }
}

module.exports = AsanakSms;
