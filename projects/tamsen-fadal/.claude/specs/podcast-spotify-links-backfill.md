# Podcast Spotify links backfill

**Status:** Planned, awaiting approval to write
**Date:** 2026-09-02
**Type:** CMS data fill (no code)

## Problem
45 of 111 items in the Podcast Episodes collection (`68a5993943f9f66c9d22b4b7`, site `68a2d5617c9630d9c780ded5`) have an empty `listen-link---spotify` field. Every episode since ep 82 (25 May 2026) is missing it, plus eps 6, 25, 36 and 63.

## Research summary
- Field slug: `listen-link---spotify` (Link). Existing values use the bare form `https://open.spotify.com/episode/<id>` with no `?si=` param (53 of 56).
- Spotify show 7KuIU0g3CsUY0eAlzQaA5T has 111 episodes plus a trailer. Full list scraped via Chrome DevTools MCP by clicking "Load more episodes" 18 times (page is client-rendered; curl returns no episode IDs).
- No Spotify API credentials available locally; scraping was the only route.
- Matching: 33 exact title matches. 11 matched by release date, show order and description text (three of those verified against the Spotify episode page description).
- Ep 112 (Brooke Burke, draft, dated 2026-09-03) is not on Spotify yet and is skipped.
- No Spotify episode ID is reused; none of the chosen IDs collide with a link already in the CMS.

## Approach
Single approach, no alternatives worth exploring: `data_cms_tool > update_collection_items` in one batched call, setting only `listen-link---spotify` per item id. Updates are staged; a follow-up `publish_collection_items` makes them live. The site was last published 2026-09-01, so a publish call must be items-only, not a full site publish, to avoid pushing unrelated Designer changes.

## Mapping
| Ep | Date | CMS title | Spotify title (if different) | URL |
|---|---|---|---|---|
| 111 | 2026-08-31 | Why I Quit My 30-Year Career (and How to Know If It’s Time to Leave Yo | 5 Signs Your Career Is No Longer Right for You | https://open.spotify.com/episode/3OrbmsX03czcvPzAS8M4K2 |
| 110 | 2026-08-27 | ADHD in Women: Why Rejection Hits You So Hard | Why Does Rejection Feel So Intense? (with ADHD Expert Dr. Sasha Hamdan | https://open.spotify.com/episode/5aB8O6r96PrXs0rtmquKoO |
| 109 | 2026-08-24 | The 5 Biggest Nutrition Mistakes Women Make After 40 | same title | https://open.spotify.com/episode/37H7hrhU8BcwClJxfmKnr5 |
| 108 | 2026-08-20 | Are You Being Love Bombed? The Narcissism Signs You’re Missing with Dr | same title | https://open.spotify.com/episode/6aMZ4a1TbZ9374f6MUocuD |
| 107 | 2026-08-17 | 4 Ways to Make Friends as an Adult (And Actually Find Your People) | same title | https://open.spotify.com/episode/5JQzT087giPbfsUIglKuA8 |
| 106 | 2026-08-13 | Why Your Belly Fat Won’t Budge (Even When You’re Doing Everything Righ | same title | https://open.spotify.com/episode/3re9ihqlQ0uWLFTaTwFVyY |
| 105 | 2026-08-10 | Chrissy Metz: Why I Finally Said Yes to a GLP-1 (And Stopped Blaming M | same title | https://open.spotify.com/episode/5tljnlk13GU5lSYwaiNb6e |
| 104 | 2026-08-06 | The Sleep Doctor to World’s Top Athletes Explains Why You Can’t Sleep | Can't Sleep? A Sleep Doctor to Top Athletes Explains Why & How to Fix  | https://open.spotify.com/episode/1Fl34StttsWFTCjCgrfYWg |
| 103 | 2026-08-03 | The 5 Signs You're Dating a Narcissist (I Missed Every One) | same title | https://open.spotify.com/episode/7u3GZZybWcsF34AQrYcRGv |
| 102 | 2026-07-30 | The Hidden Reason You Keep Choosing Emotionally Unavailable People | same title | https://open.spotify.com/episode/4hX1gAcmGqSQvMRNe38d3i |
| 101 | 2026-07-27 | What I Wish I Knew at 35: 7 Hard Truths That Changed My Life | 7 Life Changing Lessons on Friendships and Toxic Relationships | https://open.spotify.com/episode/7b0eqluxMwu75GJWaHWt9W |
| 100 | 2026-07-23 | The Menopause Gut: How to Beat Bloating and Belly Fat | same title | https://open.spotify.com/episode/7lOYreBQ9Eob0p7lha1LNZ |
| 99 | 2026-07-20 | 5 Relationship Red Flags Even Smart Women Ignore | same title | https://open.spotify.com/episode/7jlMmLxr5x9VnoOLrsQVar |
| 98 | 2026-07-16 | What No One Tells You About Grief After Losing Your Mother | same title | https://open.spotify.com/episode/2pYAzquWC11MN6Rm6sk0f3 |
| 97 | 2026-07-13 | Estrogen 101: What I Learned From the World’s Top Menopause Doctors | same title | https://open.spotify.com/episode/1AWNRr1KnsRHkwg27MAIsi |
| 94 | 2026-07-09 | The Fertility Expert: Egg Freezing, Perimenopause & GLP-1s Explained | Perimenopause, GLP-1s and Egg Freezing Explained | https://open.spotify.com/episode/0K5m47jQcsVh1q3qBfqUjc |
| 95 | 2026-07-06 | Belly Fat 101: The 5 Simple Habits That Changed Everything | same title | https://open.spotify.com/episode/6ICjevP9ex3mKmIvrgTDJb |
| 94 | 2026-07-02 | The Longevity Doctor: The 5 Simple Tests That Predict How You'll Age | same title | https://open.spotify.com/episode/3JZGuNYpgX3Bb7ZwTGn5uh |
| 93 | 2026-06-29 | Progesterone 101: The Hormone Behind Your 3am Wake-Ups, Your Anxiety & | same title | https://open.spotify.com/episode/2PxaeHRkWPW6sEoUh67sVC |
| 92 | 2026-06-25 | The Sleep Doctor: The 4 Hormones Wrecking Your Sleep & What to Do Abou | same title | https://open.spotify.com/episode/1l7fvgedQRYTmtOrFdd9E9 |
| 91 | 2026-06-22 | The Closet Clean Out Guide: Declutter Your Life and Get Your Confidenc | same title | https://open.spotify.com/episode/172k7924sc4fdL4wekYMpv |
| 90 | 2026-06-18 | The #1 Pharmacist: Creatine, Greens, Electrolytes, What's Worth Buying | same title | https://open.spotify.com/episode/6RPipTIYqutii0DW8sOCp5 |
| 89 | 2026-06-15 | Anxiety 101: What I Wish I Knew Before I Hit Perimenopause + How I Got | same title | https://open.spotify.com/episode/5W5VM0c5cTa9E8VbStUZjm |
| 88 | 2026-06-11 | The Heart Doctor: 5 Warning Signs Your Heart Is in Trouble | same title | https://open.spotify.com/episode/0Q3yVmXbmzS6IwDr7trXeA |
| 87 | 2026-06-05 | Alcohol 101: Belly Fat, Bad Sleep and the Long-Term Cost of Drinking | same title | https://open.spotify.com/episode/0DrzTbDJrb5Stcf3saNj43 |
| 86 | 2026-06-04 | Melinda French Gates: Inside Her $600 Million Mission for Women's Heal | same title | https://open.spotify.com/episode/77SJbD2QvxArjuHO508WQN |
| 85 | 2026-06-03 | The Hormone Doctor: The Truth About Cortisol, Estrogen and Balancing Y | same title | https://open.spotify.com/episode/6RjQyAzW09vJ95LOJmQVEv |
| 84 | 2026-06-01 | Shannon Elizabeth: The American Pie Star on Starting Over & Getting He | same title | https://open.spotify.com/episode/7bJ1154CFgE85PkyKBMf1Q |
| 83 | 2026-05-28 | Build Strength After 40: How to Future-Proof Your Body Starting Today  | Build Strength After 40: How to Future-Proof Your Body Starting Today | https://open.spotify.com/episode/6JSXY9cZ0ms57omR2xvr5Z |
| 82 | 2026-05-25 | Perimenopause 101: The Symptoms, Tests & Fixes No One Tells You About | same title | https://open.spotify.com/episode/1kUxw5DGALTpDR6gJFsDYx |
| 74 | 2026-04-27 | Is It the Relationship or Is It Menopause? Here's How to Tell | Relationships 101: Is It Him or Is It Menopause? Here's How to Tell | https://open.spotify.com/episode/08TYLr3sYstlIZh8G0Db2n |
| 73 | 2026-04-23 | The Insulin Doctor: How To Lose Belly Fat + Stop The Food Noise For Go | same title | https://open.spotify.com/episode/2awjuHTfOqYxnHGSrQd613 |
| 72 | 2026-04-20 | Estrogen Down There? Here's Everything You Need to Know | same title | https://open.spotify.com/episode/0YeWRalVg1cwUUVC8IiTWf |
| 71 | 2026-04-16 | One of America's Richest Self-Made Women on How to Start Before You Fe | Emma Grede: The Most Important Career Advice Every Women Need To Know | https://open.spotify.com/episode/1AM5dFTkShuAem8xpROkIb |
| 70 | 2026-04-14 | Jennie Garth on Choosing Yourself: What 90210 Taught Her About Reinven | Jennie Garth: What 90210 Taught Me About Choosing Myself | https://open.spotify.com/episode/7Kwq8n9vPyFD6gDKYcX1vq |
| 69 | 2026-04-13 | Testosterone 101: Everything You Need to Know in 20 Minutes | same title | https://open.spotify.com/episode/3gpzyrfRCJ0KQ8A6sUlUtI |
| 68 | 2026-04-09 | The Hair Loss Episode: THIS Is What a Top Dermatologist Wants You to K | same title | https://open.spotify.com/episode/5cCGHYBzWDlq53wRekiTOa |
| 67 | 2026-04-06 | Thinking About a Career Change? Start Here | same title | https://open.spotify.com/episode/6G1u2EVo8fBp92cjAk8rMr |
| 66 | 2026-04-02 | The Muscle Episode: Get Stronger, Look Better & Reverse Your Biologica | same title | https://open.spotify.com/episode/1O6cIZ6HbPRD2Qcsjy7GEL |
| 65 | 2026-03-30 | Ready to Start Dating Again? This Is the Advice I Wish I Had | same title | https://open.spotify.com/episode/0lYepu3I21fZgSAwcXZwvL |
| 63 | 2026-03-23 | If You’re Going Through a Friendship Breakup You Need To Hear This | same title | https://open.spotify.com/episode/24kN0lZcWWtBYlIJYeBmB2 |
| 36 | 2025-10-29 | The Psychology of Body Image: Why We Inherit Shame and Tools to Releas | How To Rebuild Your Confidence (At Every Age) | https://open.spotify.com/episode/6BQrb42aVyz9uvJBcbWgnM |
| 25 | 2025-08-20 | The #1 Longevity Doctor: How Women Can Burn Fat, Build Muscle & Age St | same title | https://open.spotify.com/episode/6hjtsG315JhuSoVFBFuCsg |
| 6 | 2025-04-16 | The Truth About Mammograms, Hormones and Dense Breasts | Mammograms, Dense Breasts and Hormones: What Every Woman Needs to Know | https://open.spotify.com/episode/5uxjkD08ZvZbJglIMB7yAW |

Machine-readable copy: `podcast-spotify-links-backfill.json` (item id, episode, Spotify id, confidence).

## Verify loop
- Pass: `list_collection_items` with filter `listen-link---spotify exists=false` returns exactly 1 item (ep 112 draft).
- Pass: spot-check 3 updated items via `list_collection_items` filter `id in [...]` and confirm the URL matches the mapping.
- Pass (if published): `https://www.tamsenfadal.com/podcast/<slug>` for ep 111 shows a Spotify listen link pointing at episode 3OrbmsX03czcvPzAS8M4K2.
- Regression: no other field is sent in the update payload, so nothing else can change. Item `isDraft` is not touched.
- Tier 1/2 Playwright tests: none. This is a data fill with no code change; the API re-query above is the automated check. Tier 3 manual: open one episode page on the live site after publish and click the Spotify button.

## Barba impact
N/A. No code change.

## Open questions
- Publish the 44 items after updating, or leave staged for the client to publish?
