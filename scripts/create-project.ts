import { input, confirm } from "@inquirer/prompts";
import fs from "fs/promises";

const name = await input({ message: "Enter a name for the project" });
const templatePath = `${import.meta.dirname}/template`;
const packagePath = `${process.cwd()}/${name}`;
if (!(await confirm({ message: `Creating ${packagePath}` }))) process.exit(1);

await fs.cp(templatePath, packagePath, { force: false, recursive: true });

const pkgJsonPath = `${packagePath}/package.json`;
let pkgJson = await fs.readFile(pkgJsonPath, { encoding: "utf-8" });
pkgJson = pkgJson.replace('"jacket-template"', `"${name}"`);
await fs.writeFile(pkgJsonPath, pkgJson);

console.info("Done!");

export {};
