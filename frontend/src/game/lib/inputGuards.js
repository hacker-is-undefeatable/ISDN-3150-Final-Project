export function shouldIgnoreGameplayKey(event) {
  const target = event?.target;
  if (!target) return false;
  return Boolean(
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}