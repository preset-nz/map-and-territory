module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Keep scopes flexible but encourage repo domains
    "scope-case": [2, "always", "kebab-case"],
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
  },
};
