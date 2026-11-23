# Nestmatch storyboards: upload and descriptions

## Upload

1. Unzip this file. You get a folder named `nestmate`.
2. Upload the **contents** of `nestmate` to `/dev/nestmate/` on www.planfortechnology.info, keeping the file names.
   Include the hidden `.htaccess` file if your server runs Apache. Other servers can skip it.
3. Open https://www.planfortechnology.info/dev/nestmate/ to see the landing page.

| File | Address | What it is |
|---|---|---|
| `index.html` | /dev/nestmate/ | Landing page linking all four storyboards and the spec |
| `website.html` | /dev/nestmate/website.html | Public website storyboard |
| `app.html` | /dev/nestmate/app.html | Buyer app storyboard |
| `agent.html` | /dev/nestmate/agent.html | Realtor portal storyboard |
| `admin.html` | /dev/nestmate/admin.html | Admin console storyboard |
| `nestmatch-product-spec.docx` | /dev/nestmate/nestmatch-product-spec.docx | Product spec (Word) |
| `.htaccess` | — | Tells Apache to serve pages as UTF-8 and use index.html as the folder's home page |

Notes:
- All links are relative, so the folder also works at any other address.
- The pages ask search engines not to index them (`noindex`), since they hold example data.
- Fonts load from Google Fonts. Without internet access the pages fall back to system fonts.
- Copy buttons need HTTPS, which your site already uses.

## What each storyboard does

### 1. Public website (`website.html`)
**For buyers who find Nestmatch on the web.** The front door. It explains Nestmatch in one line, lets buyers search listings with value badges, and turns interest in a home into a lead only after the buyer agrees to be contacted.
- Home page with hero search by ZIP, city or school district, how it works, households and value badges
- Listing search with a "Good value or better" filter, a map and MLS attribution
- Listing page with the estimate and its comparable sales, a payment estimate and a consented contact form
- A page that sells to agents, with plans and FAQ, plus privacy choices and data requests

### 2. Buyer app (`app.html`)
**For buyers and their households, on their phones.** Tinder for homes. A six-question interview builds a house profile, a five-second thinking screen sets up matches, and buyers swipe left to save a home or right to pass.
- Interview: home type (with icons), where, features, price range, contact info, who to share likes with
- Swipe deck with value badges, "House saved" and "House removed" pop-ups, and an optional "Why?" after each swipe
- Household lists: homes everyone saved, homes waiting on you, and homes someone ruled out
- Picks for you versus picks for the family, and a "rethink your goals" check-in that updates the profile

### 3. Realtor portal (`agent.html`)
**For agents, and for broker admins running a team.** Where agents work the leads they buy. It puts speed first with live reply timers, and gives them what no other lead source does: the buyer's profile, household and saved homes.
- Today view with leads waiting for a reply and overnight client activity
- Leads with contact, consent and profile; agent connections that introduce the buyer's agent only
- Client households, a listing pricing tool built on the value estimate, and lead buying by market and budget
- Their own website with the swipe widget, report schedules, and a Team view for broker admins

### 4. Admin console (`admin.html`)
**For the Nestmatch team running the platform.** The internal console: revenue, tenants, the lead marketplace, listing data and compliance, with every sensitive action written to an audit log.
- Overview of buyers, leads, revenue by stream and what needs attention today
- Brokerages, buyers (contact details revealed only with a logged reason) and scheduled brokerage and agent reports
- Leads with routing traces, refunds and referral closings; pricing and routing rules
- MLS feed health, value-rating thresholds, vendor ads with a RESPA review, privacy requests and consent records

All four run entirely in the browser. Nothing typed is sent or saved, and refreshing a page starts it over. All people, homes and numbers are made-up examples.

## Rebuilding

The originals live in `storyboard/` in the repository. After changing one, run `python3 storyboard/build_site.py` to regenerate the `site/` folder.
