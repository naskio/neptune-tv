export function firstCharBucket(name: string): string {
  const c = name.trim().charAt(0).toUpperCase();
  if (c >= "A" && c <= "Z") {
    return c;
  }
  return "#";
}

export function firstIndexForLetter<T>(
  items: T[],
  getName: (item: T) => string,
  letter: string,
): number {
  const L = letter === "#" ? null : letter;
  return items.findIndex((it) => {
    const b = firstCharBucket(getName(it));
    return L == null ? b === "#" : b === L;
  });
}
