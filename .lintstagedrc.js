module.exports = {
  "*.ts": ["prettier --write", "eslint --fix", "npm run type-check"],
};
