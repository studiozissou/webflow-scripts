Build a feature end-to-end using the appropriate agents.

## Prerequisites

Before starting the build, confirm:
- .env.test exists and contains STAGING_URL
- tests/acceptance/SLUG.spec.js exists (generated during /plan)
- .claude/scripts/purge-cdn.sh exists and is executable
If any of these are missing, stop and tell the user what's needed.

## Process
1. Read the spec from `.claude/specs/` (if it exists) or ask for a description.
2. Read all relevant existing files before writing anything.
3. Use the `code-writer` agent to implement the feature.
4. If the feature has motion/animation, apply the `gsap-scrolltrigger` or `barba-js` skill as appropriate.
5. After implementation, run `/qa-check` automatically.
6. Update the relevant task in `.claude/queue.json` to `"status": "done"`.
7. Present a summary of what was built, what files were changed, and any deployment steps.

## Rules
- Never start writing code without reading existing files first
- Always check `shared/utils.js` and the project orchestrator before adding new utilities
- Leave no console.log statements in completed code
- Mark all tasks complete in queue.json when done

## Verify loop

After the code is written and the reviewer has passed (PASS or WARN):

8. Stage, commit, and push:
    git add .
    git commit -m "feat(SLUG): description of changes"
    git push

9. Purge the CDN cache:
    Run: .claude/scripts/purge-cdn.sh
    This purges changed JS/CSS files from jsDelivr and waits 30s.

10. Run the acceptance tests for this feature:
    npx playwright test tests/acceptance/SLUG.spec.js --config=tests/playwright.config.js --reporter=list

11. If ANY test fails:
    a. Read the full failure output carefully
    b. Identify the root cause — is it a code bug, a timing issue, or a wrong selector?
    c. If timing issue: increase the waitForTimeout value and retry
    d. If wrong selector: check the Webflow staging site to confirm the correct selector
    e. If code bug: fix the code
    f. Go back to step 8 (commit, push, purge, test again)
    g. Track iteration count. After 8 failed iterations on the SAME test:
       - Stop and report to the user
       - List what's failing and what you've tried
       - Ask for guidance before continuing

12. If ALL acceptance tests pass:
    a. Run the full smoke test suite:
       npx playwright test tests/smoke.test.js --config=tests/playwright.config.js --reporter=list
    b. Run accessibility tests:
       npx playwright test tests/a11y.test.js --config=tests/playwright.config.js --reporter=list
    c. Report results of both suites
    d. If smoke or a11y tests fail, report the failures but don't loop —
       these are existing tests, not part of this feature's acceptance criteria

13. Proceed to the wrap-up / queue update step.
