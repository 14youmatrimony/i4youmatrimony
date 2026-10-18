# Project Rules & Guidelines - I 4 You

## Automated Git & Deployment Rule
- **Every Change Must Be Pushed to GitHub**:
  Whenever code changes, bug fixes, or enhancements are made:
  1. Always verify the build with `npm run build`.
  2. Stage all modifications: `git add -A`.
  3. Commit with a descriptive commit message: `git commit -m "<type>(<scope>): <summary>"`.
  4. Always push immediately to GitHub: `git push origin main`.
  5. Confirm `git status` is clean and up to date with `origin/main`.
- **Zero Malayalam Text**:
  All UI labels, button tooltips, toasts, modals, and comments must strictly use clean, professional English.
