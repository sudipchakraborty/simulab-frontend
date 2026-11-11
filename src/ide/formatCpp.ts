/** @brief Conservative C/C++ indentation without changing literals or preprocessor continuations.
 * @param source Source text. Raw strings and line continuations cause an unchanged result.
 * @returns Indented source, preserving multiline comment contents. This is not clang-format.
 */
export function formatCpp(source: string): string {
  if (/R"|\\\r?\n/.test(source)) return source;
  let depth = 0,
    block = false;
  return source
    .split("\n")
    .map((line) => {
      const beganInComment = block;
      let quote = "",
        escape = false,
        code = "";
      for (let i = 0; i < line.length; i++) {
        const ch = line[i],
          next = line[i + 1];
        if (block) {
          if (ch === "*" && next === "/") {
            block = false;
            i++;
          }
          continue;
        }
        if (quote) {
          if (escape) escape = false;
          else if (ch === "\\") escape = true;
          else if (ch === quote) quote = "";
          continue;
        }
        if (ch === "/" && next === "/") break;
        if (ch === "/" && next === "*") {
          block = true;
          i++;
          continue;
        }
        if (ch === '"' || ch === "'") {
          quote = ch;
          continue;
        }
        code += ch;
      }
      const leading = code.trimStart().match(/^}+/)?.[0].length ?? 0;
      const result =
        beganInComment || line.trimStart().startsWith("#")
          ? line
          : "  ".repeat(Math.min(100, Math.max(0, depth - leading))) +
            line.trim();
      depth = Math.max(
        0,
        depth +
          (code.match(/{/g)?.length ?? 0) -
          (code.match(/}/g)?.length ?? 0),
      );
      return result;
    })
    .join("\n");
}
