import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true, strict: false });

export function parseJsonStrict(rawText) {
  try {
    return JSON.parse(rawText);
  } catch (error) {
    const err = new Error("AI_JSON_PARSE_FAILED");
    err.cause = error;
    throw err;
  }
}

export function validateJson(schema, payload) {
  const validate = ajv.compile(schema);
  const valid = validate(payload);
  if (!valid) {
    const err = new Error(`AI_JSON_SCHEMA_FAILED: ${ajv.errorsText(validate.errors)}`);
    err.details = validate.errors;
    throw err;
  }
  return payload;
}

export function requireJson(schema, rawText) {
  const json = parseJsonStrict(rawText);
  return validateJson(schema, json);
}
