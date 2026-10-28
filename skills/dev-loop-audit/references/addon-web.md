# Add-on: web

On when the config's `addons` has `web`. Tags: browser tool calls (any MCP tool named for a browser, Chrome,
Playwright or Puppeteer: `browser_tool`, with `input`, `screenshot`, `page_read`), dev server starts (`dev_server`),
browser test runs (`browser_test`), preview deploys (`preview_deploy`) and "port in use" errors (`port_in_use`).
Numbers are in the Web and QA sections of `metrics.txt`.

## Reliability

1. **Dev server starts** (`dev_server_starts`): one per session is normal. Many means the server died, the agent
   could not tell it was running, or it ran in the foreground and blocked (`dev_server_fg`, and the long calls).
2. **Port in use** (`port_in_use`): two sessions or a stale server on the same port. A fix: one port per worktree,
   or a script that reuses a running server.
3. **Browser test failures** (`browser_tests.failed`): read the tails. A real catch, a flaky selector or timing, or
   an environment problem (no server, wrong base URL, a missing browser install).
4. **Preview deploys:** failures, and deploys run only to look at a change a local server would show.

## Speed

1. **Browser test time** (`browser_tests.median_s`, `p90_s`): against the trend, and whether agents run the whole
   suite where one file would do.
2. **The check step:** a click to the page seen. A screenshot or a page read in the same message as the click is
   batched. Page reads (text) are cheaper to read than screenshots; many screenshots of text-only changes is a
   speed finding.
3. **Waits:** sleeps after a navigation or a click, and loops polling a URL. Most browser tools wait for the load
   themselves.
4. **Preview deploy time** (`preview_deploys.median_s`): minutes per deploy, and how many a change needed.
