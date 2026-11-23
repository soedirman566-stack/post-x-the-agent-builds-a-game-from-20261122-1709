/* main.ts — hands the entry in: copies POST.json (which names the X post
   carrying the video) from this repository to the output directory.
   The copy is checked first: POST.json must parse and carry a string url. */
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const src = join(here, "POST.json");

const post = JSON.parse(readFileSync(src, "utf8")) as { url?: unknown };
if (typeof post.url !== "string") {
  throw new Error("POST.json must be an object with a string 'url'");
}

mkdirSync(outDir, { recursive: true });
copyFileSync(src, join(outDir, "POST.json"));
console.log("copied POST.json -> " + join(outDir, "POST.json"));
console.log("post url: " + (post.url === "" ? "(not posted yet)" : post.url));
