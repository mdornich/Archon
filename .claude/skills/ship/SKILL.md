## Ship Workflow
1. Run `ruff check . && ruff format --check .` for Python files
2. Run relevant e2e/unit tests
3. Verify ALL code paths updated (grep for related patterns)
4. Check DB migrations are applied if any were created
5. Commit with conventional commit message
6. Push and create PR with description referencing the issue
