# Task Statuses

Tasks in queue.json use these statuses:

Triage → Ready to Plan → Planning → Ready to Build → Building → Ready to Review → Done

Side tracks: Needs Debug → Debugging (rejoin at Ready to Review)
             Blocked (from any status, returns to previous status when unblocked)

Human gates: Triage→Ready to Plan (triage), Planning→Ready to Build (spec approval),
Ready to Review→Done (final sign-off).
