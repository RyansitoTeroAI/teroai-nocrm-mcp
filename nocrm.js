export class NoCrmClient {
  constructor(config) {
    this.baseUrl = `https://${config.subdomain}.nocrm.io/api/v2`;
    this.token = config.token;
    this.tokenType = config.tokenType;
  }

  async ping() {
    return this.request("GET", "/ping");
  }

  async listLeads(input = {}) {
    return this.request("GET", "/leads", input);
  }

  async getLead(id) {
    return this.request("GET", `/leads/${id}`);
  }

  async createLead(input) {
    return this.request("POST", "/leads", input);
  }

  async addLeadComment(input) {
    const { lead_id, ...body } = input;
    return this.request("POST", `/leads/${lead_id}/comments`, body);
  }

  async request(method, path, params) {
    const url = new URL(`${this.baseUrl}${path}`);
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      [this.tokenType === "api_key" ? "X-API-KEY" : "X-USER-TOKEN"]: this.token
    };

    const init = { method, headers };
    if (method === "GET" && params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, Array.isArray(value) ? value.join(",") : String(value));
        }
      }
    } else if (params) {
      init.body = JSON.stringify(params);
    }

    const response = await fetch(url, init);
    const text = await response.text();
    const body = text ? safeJsonParse(text) : null;

    if (!response.ok) {
      throw new Error(
        `noCRM API ${response.status} ${response.statusText}: ${JSON.stringify(body ?? text)}`
      );
    }

    return body;
  }
}

export function loadNoCrmConfig() {
  const subdomain = process.env.NOCRM_SUBDOMAIN;
  const token = process.env.NOCRM_TOKEN;
  const tokenType = process.env.NOCRM_TOKEN_TYPE ?? "api_key";

  if (!subdomain) throw new Error("Missing NOCRM_SUBDOMAIN");
  if (!token) throw new Error("Missing NOCRM_TOKEN");
  if (!["api_key", "user_token"].includes(tokenType)) {
    throw new Error("NOCRM_TOKEN_TYPE must be api_key or user_token");
  }

  return { subdomain, token, tokenType };
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
