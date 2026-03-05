
interface MockResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string | object;
}

interface RequestOptions {
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export class NetworkSimulator {
  private delay: number = 500; // Simulated latency in ms

  async fetch(url: string, options: RequestOptions): Promise<MockResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, this.delay));

    const normalizedUrl = url.replace(/\/$/, ""); // Remove trailing slash
    const method = options.method.toUpperCase();

    // Mock API: https://api.hintshell.com
    if (normalizedUrl.startsWith("https://api.hintshell.com")) {
      return this.handleApiRequest(normalizedUrl, method, options);
    }
    
    // Mock: google.com
    if (normalizedUrl.includes("google.com")) {
      return {
        status: 200,
        statusText: "OK",
        headers: { "Content-Type": "text/html; charset=UTF-8" },
        body: "<!doctype html><html><head><title>Google</title></head><body>...</body></html>"
      };
    }

    // Default 404
    return {
      status: 404,
      statusText: "Not Found",
      headers: { "Content-Type": "text/plain" },
      body: `404 Not Found: ${url}`
    };
  }

  private handleApiRequest(url: string, method: string, options: RequestOptions): MockResponse {
    const path = url.replace("https://api.hintshell.com", "");

    // GET /users
    if (path === "/users" && method === "GET") {
      return {
        status: 200,
        statusText: "OK",
        headers: { "Content-Type": "application/json" },
        body: [
          { id: 1, name: "Alice", role: "admin" },
          { id: 2, name: "Bob", role: "user" },
          { id: 3, name: "Charlie", role: "user" }
        ]
      };
    }

    // POST /users
    if (path === "/users" && method === "POST") {
      let data: any = {};
      try {
        data = options.body ? JSON.parse(options.body) : {};
      } catch (e) {
        return {
          status: 400,
          statusText: "Bad Request",
          headers: { "Content-Type": "application/json" },
          body: { error: "Invalid JSON body" }
        };
      }

      return {
        status: 201,
        statusText: "Created",
        headers: { "Content-Type": "application/json" },
        body: {
          id: 4,
          ...data,
          createdAt: new Date().toISOString()
        }
      };
    }

    // GET /users/1
    if (path.match(/^\/users\/\d+$/) && method === "GET") {
      const id = path.split("/")[2];
      return {
        status: 200,
        statusText: "OK",
        headers: { "Content-Type": "application/json" },
        body: { id: parseInt(id), name: "Alice", role: "admin", email: "alice@hintshell.com" }
      };
    }
    
    // GET /status
    if (path === "/status" && method === "GET") {
       return {
         status: 200,
         statusText: "OK",
         headers: { "Content-Type": "application/json" },
         body: { status: "operational", uptime: "99.9%" }
       };
    }

    return {
      status: 404,
      statusText: "Not Found",
      headers: { "Content-Type": "application/json" },
      body: { error: "Endpoint not found" }
    };
  }
}

export const network = new NetworkSimulator();
