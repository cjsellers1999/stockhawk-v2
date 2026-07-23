/** @type {import("prettier").Config} */
const config = {
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindFunctions: [
    "classNames",
    "clsx",
    "cn",
    "cva",
    "tw",
    "twJoin",
    "twMerge",
  ],
  tailwindStylesheet: "./apps/web/src/styles.css",
};

export default config;
