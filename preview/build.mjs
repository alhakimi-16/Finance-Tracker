// Builds the test version: one HTML file with the real app, an in-memory database and no server.
// Usage: npm run preview  ->  preview/dist/kassenbuch-test.html
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwind from "@tailwindcss/postcss";
import { build } from "esbuild";
import postcss from "postcss";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

// the parts of Next.js and Supabase the test version replaces
const replacements = {
  "next/link": path.join(here, "next-link.tsx"),
  "next/navigation": path.join(here, "next-navigation.ts"),
  "next/image": path.join(here, "next-image.tsx"),
  "@/lib/backend": path.join(here, "demo-backend.ts"),
};

const logo = await readFile(path.join(root, "public/logo.png"));

const js = await build({
  entryPoints: [path.join(here, "main.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  tsconfig: path.join(root, "tsconfig.json"),
  nodePaths: [path.join(root, "node_modules")],
  legalComments: "none",
  logOverride: { "module-level-directive": "silent" },
  define: {
    "process.env.NODE_ENV": '"production"',
    __LOGO_DATA_URI__: JSON.stringify(`data:image/png;base64,${logo.toString("base64")}`),
  },
  plugins: [
    {
      name: "replace-next-and-supabase",
      setup(pluginBuild) {
        pluginBuild.onResolve({ filter: /^(next\/(link|navigation|image)|@\/lib\/backend)$/ }, (args) => ({
          path: replacements[args.path],
        }));
      },
    },
  ],
});

const cssInput = `@import "./src/app/globals.css";\n:root { --font-cairo: "Cairo"; }\n`;
const css = await postcss([tailwind({ base: root, optimize: { minify: true } })]).process(cssInput, {
  from: path.join(root, "preview-input.css"),
});

const script = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const head = `<title>VJSD7 Kassenbuch</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap">
<style>${css.css}</style>`;
const app = `<div id="app"></div>
<script>${script}</script>`;

const outputs = {
  // a complete page that opens in any browser
  "kassenbuch-test.html": `<!doctype html>
<html lang="de" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
${head}
</head>
<body>
${app}
</body>
</html>
`,
  // the same without the document frame, for hosts that add their own
  "kassenbuch-test.fragment.html": `${head}\n${app}\n`,
};

await mkdir(path.join(here, "dist"), { recursive: true });
for (const [name, html] of Object.entries(outputs)) {
  const out = path.join(here, "dist", name);
  await writeFile(out, html);
  console.log(`${path.relative(root, out)}  ${(html.length / 1024).toFixed(0)} KB`);
}
