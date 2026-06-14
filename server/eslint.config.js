export default [{
  files: ["src/**/*.js", "api/**/*.js"],
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    globals: {
      console: "readonly",
      process: "readonly",
      URL: "readonly",
      Buffer: "readonly"
    }
  },
  rules: {
    "no-undef": "error",
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}];
