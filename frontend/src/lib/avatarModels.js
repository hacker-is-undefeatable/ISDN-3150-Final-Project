export const ALLOWED_CHARACTER_MODELS = [
  { code: "model00000", label: "Character 00000" },
  { code: "model00001", label: "Character 00001" },
  { code: "model00010", label: "Character 00010" },
  { code: "model00011", label: "Character 00011" },
  { code: "model00100", label: "Character 00100" },
  { code: "model00101", label: "Character 00101" },
  { code: "model00110", label: "Character 00110" },
  { code: "model00111", label: "Character 00111" },
  { code: "model01000", label: "Character 01000" },
  { code: "model01001", label: "Character 01001" },
  { code: "model01010", label: "Character 01010" },
];

export const DEFAULT_CHARACTER_MODEL = ALLOWED_CHARACTER_MODELS[0].code;

export const ALLOWED_CHARACTER_MODEL_CODES = new Set(
  ALLOWED_CHARACTER_MODELS.map((entry) => entry.code)
);

export function getCharacterModelPath(modelCode) {
  const safeCode = ALLOWED_CHARACTER_MODEL_CODES.has(modelCode)
    ? modelCode
    : DEFAULT_CHARACTER_MODEL;

  return `/model/${safeCode}.vrm`;
}
