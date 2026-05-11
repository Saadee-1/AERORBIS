declare namespace Deno {
  interface Env {
    get(name: string): string | undefined;
  }
}

declare const Deno: {
  env: Deno.Env;
};
