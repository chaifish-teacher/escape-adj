// Student recording and remote ranking are disabled.
export type Leader = { name: string; rankingTime: number; actualTime: number };
export function hasBackend() {
  return false;
}
export async function call(
  _action: string,
  _payload: Record<string, unknown> = {},
  _requestId?: string,
): Promise<any> {
  throw new Error("Student recording is disabled.");
}
