module.exports = {
  extends: "expo",
  ignorePatterns: ["/dist/*", "/node_modules/*"],
  overrides: [
    {
      files: ["*.config.js", "metro.config.js", "babel.config.js"],
      env: { node: true },
    },
  ],
};
