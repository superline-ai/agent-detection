import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

export default [
  // ESM build
  {
    input: "src/index.ts",
    output: {
      dir: "dist/esm",
      format: "esm",
      sourcemap: true,
      exports: "named",
      preserveModules: true,
      preserveModulesRoot: "src",
    },
    plugins: [
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "dist/esm/types",
        outDir: "./dist/esm",
      }),
      resolve(),
      commonjs(),
    ],
  },
  // UMD build (for browsers)
  {
    input: "src/index.ts",
    output: {
      dir: "dist/umd",
      entryFileNames: "index.umd.js",
      format: "umd",
      name: "AgentDetector",
      sourcemap: true,
      exports: "named",
    },
    plugins: [
      typescript({
        tsconfig: "./tsconfig.json",
        outDir: "./dist/umd",
      }),
      resolve(),
      commonjs(),
      process.env.NODE_ENV === "production" &&
        terser({ keep_classnames: true, keep_fnames: true }),
    ],
  },
  // CJS build
  {
    input: "src/index.ts",
    output: {
      dir: "dist/cjs",
      format: "cjs",
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: "src",
      exports: "named",
    },
    plugins: [
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        outDir: "./dist/cjs",
      }),
      resolve(),
      commonjs(),
    ],
  },
];
