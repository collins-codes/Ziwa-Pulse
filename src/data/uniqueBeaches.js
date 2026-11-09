export function uniqueBeachesByName(beaches) {
  const seen = new Set();
  return beaches.filter((beach) => {
    const key = `${beach.county}:${beach.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
