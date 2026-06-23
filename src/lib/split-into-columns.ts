/** Reparte ítems en N columnas en orden round-robin (columna 0: 0,3,6…). */
export function splitIntoColumns<T>(items: T[], columnCount: number): T[][] {
  if (columnCount <= 1) return [items];
  const cols: T[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, i) => {
    cols[i % columnCount]!.push(item);
  });
  return cols;
}
