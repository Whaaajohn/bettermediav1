import http from "http";

const baseUrl = process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5174}`;

function request(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${baseUrl}${pathname}`, { timeout: 8000 }, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({ statusCode: res.statusCode, body });
      });
    });
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
  });
}

const result = await request("/api/ready");
console.log(result.body);
if (result.statusCode >= 500) process.exit(1);
