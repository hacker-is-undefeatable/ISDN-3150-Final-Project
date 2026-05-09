import OpenAI from "openai";

function getAzureConfig() {
  const endpoint =
    process.env.HKUST_AZURE_OPENAI_ENDPOINT ||
    process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey =
    process.env.HKUST_AZURE_OPENAI_API_KEY ||
    process.env.AZURE_OPENAI_API_KEY;
  const deployment =
    process.env.HKUST_AZURE_OPENAI_DEPLOYMENT ||
    process.env.AZURE_OPENAI_DEPLOYMENT ||
    process.env.AZURE_OPENAI_MODEL;
  const apiVersion =
    process.env.HKUST_AZURE_OPENAI_API_VERSION ||
    process.env.AZURE_OPENAI_API_VERSION ||
    "2024-06-01";

  if (!endpoint || !apiKey || !deployment) {
    return null;
  }

  const baseURL = `${endpoint.replace(/\/+$/, "")}/openai/deployments/${deployment}`;
  return { apiKey, baseURL, apiVersion, deployment };
}

function createClient() {
  const azure = getAzureConfig();
  if (azure) {
    return new OpenAI({
      apiKey: azure.apiKey,
      baseURL: azure.baseURL,
      defaultQuery: { "api-version": azure.apiVersion },
      defaultHeaders: { "api-key": azure.apiKey }
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "Missing OpenAI credentials. Set HKUST_AZURE_OPENAI_* or OPENAI_API_KEY in backend-node/.env."
    );
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const client = createClient();

function extractText(response) {
  if (response.output_text) {
    return response.output_text;
  }
  const output = response.output?.[0];
  const content = output?.content?.[0];
  return content?.text || "";
}

async function requestAzureJson({ azure, system, user }) {
  const url = `${azure.baseURL}/chat/completions?api-version=${azure.apiVersion}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": azure.apiKey
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Azure OpenAI error ${response.status}: ${text}`);
  }

  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content || "";
}

export async function requestJson({ system, user, schema, schemaName }) {
  const azure = getAzureConfig();
  const model = azure
    ? azure.deployment
    : process.env.OPENAI_MODEL || "gpt-4.1-mini";

  if (azure) {
    return requestAzureJson({ azure, system, user, schema, schemaName });
  }

  const response = await client.responses.create({
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: schemaName,
        schema,
        strict: true
      }
    }
  });

  return extractText(response);
}
