export type TorqaRequest =
  | { kind: "surface"; workspaceRoot: string; relativePath: string }
  | {
      kind: "build";
      workspaceRoot: string;
      relativePath: string;
      outDir?: string;
      engineMode?: "python_only" | "rust_preferred" | "rust_only";
    }
  | { kind: "benchmark" };
