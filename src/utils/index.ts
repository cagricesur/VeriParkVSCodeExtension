export function ResolveSeq(
  ...promises: (() => Promise<any>)[]
): Promise<any[]> {
  return new Promise<any[]>(async (resolve) => {
    const values: any[] = [];
    for (const promise of promises) {
      try {
        values.push(await promise());
      } catch {
        break;
      }
    }
    resolve(values);
  });
}
