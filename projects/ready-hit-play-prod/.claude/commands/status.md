# /status

Show current task status from queue.json.

1. Read .claude/queue.json
2. Filter out items with status Done
3. Group by client, sort by priority within each client
4. Display:

   ## Client: Ready Hit Play
   | Task               | Status          | Priority |
   |--------------------|-----------------|----------|
   | Hero animation     | Building        | High     |
   | CMS filter         | Blocked         | Medium   |

5. If any tasks are Blocked, highlight:
   "! 1 blocked task: CMS filter — [blocker reason]"

6. Summary: "3 active tasks across 2 clients (1 blocked)"

7. If the user provides a client name ("/status ready-hit-play"), filter
   to only that client.
