import http from "http";

const baseUrl = process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5174}`;
const endpoints = ["/api/health", "/api/version", "/api/ready"];

function request(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${baseUrl}${pathname}`, { timeout: 5000 }, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({ pathname, statusCode: res.statusCode, body });
      });
    });
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
  });
}

const results = [];
for (const endpoint of endpoints) {
  results.push(await request(endpoint));
}

console.log(JSON.stringify(results.map((result) => ({
  endpoint: result.pathname,
  statusCode: result.statusCode,
  ok: result.statusCode >= 200 && result.statusCode < 300,
})), null, 2));

if (results.some((result) => result.statusCode >= 500)) process.exit(1);
