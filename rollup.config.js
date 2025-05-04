import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

export default [
  // ESM build
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.esm.js",
      format: "esm",
      sourcemap: true,
      exports: "named",
    },
    plugins: [
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "dist",
      }),
      resolve(),
      commonjs(),
      process.env.NODE_ENV === "production" && terser(),
    ],
  },
  // UMD build (for browsers)
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.umd.js",
      format: "umd",
      name: "AgentDetector", // Global variable name when loaded via script tag
      sourcemap: true,
      exports: "named",
    },
    plugins: [
      typescript({
        tsconfig: "./tsconfig.json",
      }),
      resolve(),
      commonjs(),
      process.env.NODE_ENV === "production" && terser(),
    ],
  },
];
