import fs from "node:fs/promises"
import path from "node:path"
import pngToIco from "png-to-ico"
import sharp from "sharp"

const root = process.cwd()
const input = path.join(root, "public", "Logo-url.png")
const output = path.join(root, "public", "favicon.ico")

const sizes = [16, 32, 48, 64, 128, 256]
const source = await fs.readFile(input)

const pngs = await Promise.all(
  sizes.map((size) =>
    sharp(source)
      // Remove bordas/fundo uniforme (normalmente preto) para a marca ocupar mais área útil.
      .trim({ threshold: 8 })
      .resize(size, size, {
        // Mantém proporção e ocupa o máximo possível dentro do quadrado.
        fit: "contain",
        position: "centre",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer(),
  ),
)

const ico = await pngToIco(pngs)
await fs.writeFile(output, ico)

console.log("Wrote", output)
