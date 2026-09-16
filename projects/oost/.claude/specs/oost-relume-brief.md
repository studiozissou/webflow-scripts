# Restaurant Oost — Relume Publish project brief

Copy source: Google Doc "Oost website tekst", draft v2, with the owners' edits as of 16 September 2026. Prepared by Studio Zissou.

---

## 0. Instructions for Relume

1. **Build exactly four pages plus a 404.** The sitemap in section 3 is final. Do not add a blog, news, gallery, contact or reservations page.
2. **Use the copy verbatim.** Every heading, paragraph, FAQ, button label and menu line below is final client copy in Dutch. Do not rewrite, shorten, translate or improve it. If a component cannot hold the full text, pick a different component rather than cutting words.
3. **Keep placeholders.** Anything in `[square brackets]` is a fact still to come from the owners. Leave it in brackets so it stays visible.
4. **One section, one component.** Each page lists its sections top to bottom. Each section gives its purpose, a suggested component, then the copy.
5. **Language:** Dutch, informal "je". Dish names stay Indonesian. The English locale is added later in Webflow, not here.
6. **The menu lives on the homepage.** The nav item "Menukaart" anchors to `/#menukaart`. No separate menu page, no PDF, no image of a menu.
7. **"Reserveer een tafel" is a button, not a page.** It opens a Formitable booking overlay on every page.
8. **No stock photography.** Use image placeholders labelled with a shot from section 6.

---

## 1. The business

- **Name:** Restaurant Oost. Guests say "Oost".
- **What:** Indonesian family restaurant in Haarlem, Netherlands. Dine-in, lunch, takeaway (collection only) and catering.
- **Who:** Nijne and Levy, a couple. They cook the recipes of their grandmothers, Oma Fanny and Oma Norma. One runs the kitchen, the other the floor, phone and Instagram.
- **Address:** Zijlweg 82, 2013 DL Haarlem
- **Phone:** 023-7851562
- **WhatsApp:** [06 00 00 00 00]
- **KvK:** 42064913
- **Instagram:** Restaurant Oost
- **Domain:** oosteeten.nl

**Opening hours**

| Dag | Tijd |
|---|---|
| Maandag | 12:00–22:00 |
| Dinsdag | Gesloten |
| Woensdag | 12:00–22:00 |
| Donderdag | 12:00–22:00 |
| Vrijdag | 12:00–22:00 |
| Zaterdag | 17:00–22:00 |
| Zondag | 17:00–22:00 |

**Goals, in order:**
1. Book a table.
2. Order takeaway by WhatsApp or phone.
3. Request a catering quote.

Search goal: rank locally for "indonesisch restaurant haarlem", "indonesisch afhalen haarlem", "rijsttafel haarlem" and "indonesische catering haarlem".

**Audience:** Haarlem locals and nearby villages such as Heemstede, Bloemendaal and Overveen. Families, couples, solo diners, office lunches. Most arrive on a phone from Google Maps wanting the menu, the hours and a way to book or call. Expats and tourists come later via the English locale.

**Voice:** warm, direct, first person plural, plain. No marketing adjectives. Never use "beste", "authentiek", "ambachtelijk", "passie" or "beleving". Jokes are rare and dry.

**Integrations to design for:**
- Formitable booking widget, opened by a button
- WhatsApp deep links with prefilled text
- Google Maps route link
- Instagram link
- One native form on the catering page

---

## 2. Design direction

- **Logo (supplied):** a Barong mask, "RESTAURANT" in small caps, and "oost" in a light high-contrast serif. White lockup on near-black.
- **Palette:** light pages so the menu is easy to read. Header and footer bands in near-black ink carrying the white logo. One warm accent for buttons and spice icons, in the range of sambal red or palm-sugar amber. No gradients.
- **Type:** two families at most. A high-contrast serif such as Cormorant Garamond for headings, to match the wordmark. One clean sans for body, menu and UI.
- **Feel:** a family restaurant, not a chain and not a food hall. Generous whitespace, real photography, large readable menu text. Nothing glossy.
- **Mobile first.** Menu, hours, call and book must be reachable within one or two thumb scrolls.
- **Menu icons:** 🌱 vegetarian, 🌶 spicy, 🌶🌶 very spicy, placed after the dish name. Leave room for a small "op" tag meaning sold out today.
- **Framework:** Client First. Export target is Webflow.

---

## 3. Sitemap

| Path | Page | Sections |
|---|---|---|
| `/` | Home | Hero · Menukaart · Vanavond eten? · Wat gasten zeggen · Veelgestelde vragen · De familie |
| `/afhalen` | Afhalen | Hero · Zo werkt het · Wat mensen het meest afhalen · Rijsttafel afhalen · Thuis opwarmen · Voor wie het handig is · Voor een groep · Afhaaltijden · Veelgestelde vragen |
| `/catering` | Catering | Hero · Wat we maken · Hoeveel heb je nodig · Catering in Haarlem en omgeving · Hoe het gaat + formulier · Veelgestelde vragen |
| `/over-ons` | Over ons | Hero · Waarom Oost · Wie er in de keuken staat |
| `/404` | Niet gevonden | One line and a link to the menu |

---

## 4. Global elements

### Navigation
Menukaart (→ `/#menukaart`) · Afhalen · Catering · Over ons · **Reserveer een tafel** (button) · NL / EN

### Footer
**Restaurant Oost** · Zijlweg 82, 2013DL Haarlem · 023-7851562 · App ons · Route

Maandag 12-22
Dinsdag Gesloten
Woensdag 12-22
Donderdag 12-22
Vrijdag 12-22
Zaterdag 17-22
Zondag 17-22

Instagram Restaurant Oost · KvK 42064913

Indonesisch familierestaurant in Haarlem. Dineren, afhalen en catering.

### Button labels (use only these)
Reserveer een tafel · Bestel om af te halen · App ons · Bel ons · Route · Bekijk de menukaart · Vraag een offerte aan

### WhatsApp prefilled messages
- Afhalen: `Hoi Oost, ik wil graag afhalen: `
- Vraag: `Hoi Oost, `

### Form messages
- Gelukt: Dank je. We reageren binnen een dag, meestal sneller.
- Mislukt: Dat ging mis. Bel of app ons even, dan regelen we het zo.

### 404
Deze pagina bestaat niet. De rendang wel. → Naar de menukaart

---

## 5. Pages

### 5.1 Home `/`

**Title tag:** Oost – Indonesisch restaurant in Haarlem: Dineren, lunch, afhalen, bezorgen & catering
**Meta description:** Oost is het Indonesische familierestaurant van Haarlem. Rijsttafel, nasi campur, saté, rendang en gado-gado dicht bij huis. Bekijk de kaart, reserveer of haal af.

#### Section 1 — Hero
- **Purpose:** say what and where in one line, then offer three actions.
- **Component:** hero with H1, one paragraph, three buttons, one large photo of a rijsttafel on the table.

**H1:** Indonesisch eten zoals bij ons thuis, midden in Haarlem

Welkom bij Oost, het Indonesische familierestaurant van Haarlem. Wij zijn Nijne en Levy, en we koken zoals Oma Fanny en Oma Norma het ons leerde, wat vooral betekent: koken met liefde. Je kunt bij ons komen eten, je kunt het meenemen naar huis, en als je een feest hebt, koken we de rijsttafel voor het hele feest.

[Reserveer een tafel] [Bestel om af te halen] [App ons]

#### Section 2 — Menukaart (anchor `#menukaart`)
- **Purpose:** the full menu as real text. This is what most visitors came for.
- **Component:** menu list with six groups. Each group has a group title, an optional short intro, then rows of dish name with icons, description and price. A legend line and a link at the bottom.

**H2:** Menukaart

Alles hieronder komt uit onze eigen keuken, geleerd door de jaren heen en er een eigen draai aan gegeven. Indonesië riep in 2018 vijf gerechten uit tot nationaal gerecht: gado-gado, soto, saté, nasi goreng en rendang. Die staan allemaal op onze kaart. Niet omdat het moet maar omdat we het zelf ook gewoon heel lekker vinden.

Bij elk gerecht staat of het vegetarisch is en hoe pittig. Allergie? Zeg het even, dan zeggen we precies wat kan. En alles op de kaart is ook af te halen.

**Rijsttafel**

Kies voor twee, vier of de hele tafel. Wij kiezen de schaaltjes uit de kaart hieronder, jij zegt hoe pittig. Het is de rijsttafel die we thuis ook maken, alleen nu in Haarlem en met meer schaaltjes.

Als je nog nooit een rijsttafel hebt gehad: het is geen Indonesisch gerecht, het is een Nederlands-Indische gewoonte. Veel kleine schaaltjes, één grote pan rijst, en iedereen pakt van alles een beetje.

| Gerecht | Omschrijving | Prijs |
|---|---|---|
| **Rijsttafel Oost** | Twaalf schaaltjes, witte rijst, kroepoek en atjar. Vanaf twee personen. Kan ook helemaal vegetarisch. | € 32,50 p.p. |
| **Nasi rames** | Voor als je alleen bent: vijf gerechten van vandaag op één bord, met rijst. | € 18,50 |

**Vlees & vis**

De rendang staat hier vier uur op. De saté gaat op houtskool, niet op een plaat. Het zijn [oma]'s recepten en we hebben er niets aan veranderd, ook niet toen iemand dat voorstelde.

| Gerecht | Omschrijving | Prijs |
|---|---|---|
| **Rendang sapi** 🌶 | Rundvlees, urenlang gestoofd in kokosmelk en specerijen tot het uit elkaar valt. Dit is het gerecht dat we het vaakst opnieuw moeten koken omdat hij op is. | € 18,50 |
| **Saté ajam** | Kipsaté van de houtskoolgrill, zes stokjes, met onze eigen pindasaus en kroepoek. | € 14,50 |
| **Saté babi** | Varkenssaté, een nacht gemarineerd in ketjap en knoflook. Zoet en een beetje plakkerig, zoals het hoort. | € 15,00 |
| **Ajam pedis** 🌶🌶 | Kip in rode sambal, langzaam gegaard. Dit is de pittige. | € 16,50 |
| **Babi ketjap** | Varkensvlees in zoete ketjap met ui en gember. Vroeger thuis het gerecht voor de kinderen. Dat is het hier ook. | € 16,50 |
| **Ikan pepes** | Vis in bananenblad, gestoomd met citroengras, gember en kemiri. Welke vis hangt af van wat er die ochtend was. | € 17,50 |

**Vegetarisch**

De helft van onze kaart is vegetarisch. Dat is geen keuze geweest, zo was het thuis ook: groenten en tempé stonden gewoon naast het vlees en niemand vond dat bijzonder.

| Gerecht | Omschrijving | Prijs |
|---|---|---|
| **Gado-gado** 🌱 | Gestoomde groenten, tahoe, ei en kroepoek met warme pindasaus eroverheen. | € 13,50 |
| **Sambal goreng boontjes** 🌱🌶 | Sperziebonen in sambal met kokos. Klein schaaltje, je wilt er twee. | € 12,50 |
| **Tempé orek** 🌱 | Krokant gebakken tempé in zoete ketjap met een beetje chili. | € 12,50 |
| **Sajoer lodeh** 🌱 | Groenten in kokosmelk met laos en salamblad. Mild, voor als de rest te pittig is. | € 13,00 |
| **Terong balado** 🌱🌶 | Gebakken aubergine in sambal balado met tomaat. | € 13,00 |
| **Tahoe telor** 🌱 | Omelet met tahoe en taugé, pindasaus erover. Straateten uit Surabaya, waar [oma] vandaan komt. | € 13,50 |

**Rijst & bami**

Los te bestellen, en het meest afgehaald van alles.

| Gerecht | Omschrijving | Prijs |
|---|---|---|
| **Nasi goreng** | Gebakken rijst met ei, kip en kroepoek. Ook zonder kip. | € 12,50 |
| **Bami goreng** | Gebakken mie met groenten, ei en kip. Ook zonder kip. | € 12,50 |
| **Witte rijst** 🌱 | | € 3,00 |

**Erbij**

| Gerecht | Omschrijving | Prijs |
|---|---|---|
| **Lumpia** (2 stuks) | Krokant, met kip en groenten. Of alleen groenten. | € 6,50 |
| **Kroepoek** 🌱 | | € 3,00 |
| **Atjar** 🌱 | Zoetzure komkommer en wortel. | € 3,00 |
| **Sambal, extra** 🌱🌶 | [Oma]'s eigen. Begin met een half lepeltje. | € 1,00 |

**Zoet**

| Gerecht | Omschrijving | Prijs |
|---|---|---|
| **Spekkoek** | Laagje voor laagje gebakken, [oma]'s recept, [twintig] laagjes. Ook per plak om mee te nemen. | € 5,50 |
| **Pisang goreng** 🌱 | Gebakken banaan met palmsuiker. | € 6,00 |

Legend: 🌱 vegetarisch · 🌶 pittig · 🌶🌶 echt pittig · **op** = vandaag uitverkocht

Alles ook af te halen. Zo werkt afhalen → /afhalen

#### Section 3 — Vanavond eten?
- **Purpose:** address, hours and the booking button in one glance.
- **Component:** two columns. Left: H2, two paragraphs, two buttons. Right: the seven-day hours list from section 1 and a map.

**H2:** Vanavond eten?

Zijlweg 82, Haarlem [wijk]. Je hoeft niet te reserveren, maar op vrijdag en zaterdag zit het vol, dus dan is het wel handig. Loop je gewoon binnen, dan kijken we of er plek is. Meestal wel, soms even wachten aan de bar.

Kom je alleen? Neem plaats aan onze grote tafel, gezelschap vind je hier vanzelf.

[Reserveer een tafel] [Route]

#### Section 4 — Wat gasten zeggen
- **Purpose:** social proof from Google.
- **Component:** three testimonial cards. Quote, first name, "via Google".

**H2:** Wat gasten zeggen

[Drie Google-reviews, letterlijk overgenomen, voornaam + "via Google". Elk kwartaal één vervangen.]

#### Section 5 — Veelgestelde vragen
- **Purpose:** answer the questions people would otherwise phone about.
- **Component:** accordion, one item per question.

**H2:** Veelgestelde vragen

**Moet ik reserveren?**
Nee. Op vrijdag en zaterdag is het wel handig, want dan zit het vol. Doordeweeks en op zondag kun je meestal gewoon binnenlopen, en anders wacht je even aan de bar.

**Wat is een rijsttafel precies?**
Veel kleine schaaltjes, één grote pan rijst, en iedereen pakt van alles een beetje. Het is geen Indonesisch gerecht, het is een Nederlands-Indische gewoonte die in Indonesië zelf bijna niemand kent. Bij ons vanaf twee personen. De schaaltjes kiezen wij, hoe pittig kies jij.

**Is het eten erg pittig?**
Alleen als je dat wilt. Bij elk gerecht staat hoe pittig het is, alles kan milder, en de sambal staat apart op tafel zodat je zelf bepaalt hoe ver je gaat.

**Kan ik vegetarisch eten?**
Ja. De helft van de kaart is vegetarisch: gado-gado, tempé, sajoer lodeh, terong balado, tahoe telor. De rijsttafel kan helemaal vegetarisch, en dat is dan geen kleinere rijsttafel.

**Is het geschikt voor kinderen?**
Ja. De meeste kinderen willen saté met witte rijst en een gebakken ei, sambal apart, en dat is een prima maaltijd. Er staat een kinderstoel en er liggen kleurpotloden bij de bar.

**Zijn jullie op zondag open?**
Ja, van 17:00 tot 22:00. Dinsdag zijn we dicht, dan doet [oma] de boodschappen.

**Waar zit Oost en kan ik parkeren?**
Zijlweg 82, in Haarlem [wijk], [x] minuten lopen van het station. Parkeren kan [op straat / bij …]. Fietsen kun je gewoon voor de deur zetten.

**Kan ik met een groep komen?**
Tot [twaalf] personen aan één tafel, als je even belt. Meer dan dat, of liever bij jou thuis of op kantoor? Dan koken we het als catering → /catering.

**Hoe zit het met allergieën?**
Pinda zit in de satésaus en in de gado-gado, verder nergens. Gluten zitten in ketjap en bami. Zeg het bij het bestellen, dan zeggen we precies wat kan.

#### Section 6 — De familie
- **Purpose:** one paragraph and a photo, pointing to the About page.
- **Component:** image and text, one link.

**H2:** De familie

Oost is een familiebedrijf van twee. [Naam] staat in de keuken, [naam] doet de zaal, de telefoon en Instagram. De sambal proeven ze allebei, en het duurt meestal even voor ze het eens zijn. Lees ons verhaal → /over-ons

---

### 5.2 Afhalen `/afhalen`

**Title tag:** Indonesisch afhalen in Haarlem – rijsttafel & saté | Oost
**Meta description:** Indonesisch eten afhalen in Haarlem? Bestel je rijsttafel, nasi goreng of saté bij Oost via WhatsApp of telefoon en haal het warm op. Ook op zondag.

#### Section 1 — Hero
- **Component:** hero with H1, one paragraph, two buttons. One opens WhatsApp, one dials the phone.

**H1:** Indonesisch afhalen in Haarlem

Geen zin om te koken? Bestel bij Oost, het Indonesische familierestaurant aan de Zijlweg, en haal het warm op. App of bel ons, zeg hoe laat je komt, en het staat klaar. Alles van de menukaart kan mee, van een portie saté tot een hele rijsttafel. We zitten [x] minuten lopen van het station, dus als je uit de trein stapt en geen zin hebt in de supermarkt, dan weet je het.

[App je bestelling] [Bel 023-7851562]

#### Section 2 — Zo werkt het
- **Component:** three numbered steps side by side.

**H2:** Zo werkt het

1. **Kies uit de menukaart.** Alles op de kaart is af te halen, ook de rijsttafel. Bekijk de menukaart → /#menukaart
2. **App of bel ons.** Zeg wat je wilt en hoe laat je komt. Een half uur van tevoren is meestal genoeg. Bij een rijsttafel liever een dag.
3. **Haal op aan Zijlweg 82.** Pinnen of contant, allebei goed. Parkeren kan [op straat / bij …]. Fietsen kun je gewoon voor de deur zetten.

#### Section 3 — Wat mensen het meest afhalen
- **Component:** list of five short items, optionally with a small dish photo each, then a closing paragraph.

**H2:** Wat mensen het meest afhalen

Nasi goreng en bami goreng, veruit. Met of zonder kip, en met een gebakken ei erop als je dat erbij zegt.

Saté ajam, zes stokjes. De pindasaus gaat apart mee, anders wordt de kroepoek slap voor je thuis bent.

Rendang met witte rijst. Als je het tot morgen kunt laten staan wordt het alleen maar beter, maar dat lukt bijna niemand.

Gado-gado, ook in losse bakjes: groenten, saus en kroepoek apart.

Spekkoek per plak, voor erna. En pisang goreng, al is die na twintig minuten in de fiets minder krokant dan hier.

Een nasi of bami is een portie voor één. Bij de hoofdgerechten geldt: één schaaltje met rijst is een maaltijd, en twee schaaltjes delen met z'n tweeën is meer dan genoeg.

#### Section 4 — Rijsttafel afhalen
- **Component:** image and text.

**H2:** Rijsttafel afhalen

Onze rijsttafel voor thuis: vanaf twee personen, twaalf schaaltjes, met witte rijst, kroepoek en atjar. Alles apart verpakt, zodat je het zelf op tafel kunt zetten zoals wij dat hier doen. Bestel het liefst een dag van tevoren. Dan staat de rendang al op als je belt en hoeven wij niet te haasten. Vegetarisch kan helemaal, of half.

Wat zit erin? Dat hangt af van wat er die dag goed is, maar reken op rendang, saté, ajam pedis of babi ketjap, gado-gado, sambal goreng boontjes, tempé en sajoer lodeh, en nasi en bami erbij. Wil je iets per se, of juist niet? Zeg het bij de bestelling. Dat is geen moeite.

#### Section 5 — Thuis opwarmen
- **Component:** plain text block.

**H2:** Thuis opwarmen

Als je het niet meteen eet: de stoofgerechten (rendang, ajam pedis, babi ketjap) kun je gewoon in een pannetje opwarmen op laag vuur, met een scheutje water erbij. Saté kort in de oven of in de pan, liever niet in de magnetron, dan wordt hij taai. Nasi en bami in de pan met een beetje olie. Gado-gado eet je koud of lauw, alleen de saus warm. Kroepoek laat je met rust.

#### Section 6 — Voor wie het handig is
- **Component:** plain text block, optional small map.

**H2:** Voor wie het handig is

Vanuit Haarlem-Centrum en [de Burgwal / het Rozenprieel / Haarlem-Oost / de Leidsebuurt] ben je lopend of op de fiets in een paar minuten hier. Vanuit Heemstede, Bloemendaal en Overveen is het een klein stukje fietsen. Vanuit Schalkwijk en Haarlem-Noord kom je waarschijnlijk met de auto, en dan kun je [op straat] parkeren. Kom je met de trein, dan is station Haarlem [x] minuten lopen.

#### Section 7 — Voor een groep
- **Component:** short text block with one link.

**H2:** Voor een groep

Lunch met collega's, verjaardag thuis, een avond met te veel mensen voor je eigen keuken. Tot een stuk of acht personen is dat gewoon een grote afhaalbestelling. Daarboven doen we het als catering, met bakken die op tafel kunnen en een briefje bij elk gerecht. Meer over catering → /catering

#### Section 8 — Afhaaltijden
- **Component:** the seven-day hours list from section 1, with one line under it.

**H2:** Afhaaltijden

Op zondag gewoon open. Feestdagen zetten we hier en op Google.

#### Section 9 — Veelgestelde vragen
- **Component:** accordion.

**H2:** Veelgestelde vragen

**Kan ik op zondag afhalen?**
Ja. Zondag is bij ons een gewone dag, van 17:00 tot 22:00.

**Bezorgen jullie ook?**
Nee, alleen afhalen. Dan komt het warm aan, en we hoeven geen bezorgkosten te rekenen. We staan ook niet op Thuisbezorgd.

**Hoe ver van tevoren moet ik bestellen?**
Nasi, bami en saté: een half uur. Rendang en de andere stoofgerechten: ook een half uur, die staan al op. Rijsttafel: liefst een dag.

**Kan ik ook aan de deur bestellen?**
Ja, maar dan wacht je even. Appen of bellen is sneller.

**Kan ik vegetarisch bestellen?**
Ja. Gado-gado, tempé, sajoer lodeh, sambal goreng boontjes, terong balado, tahoe telor, en nasi of bami zonder kip. De rijsttafel kan helemaal vegetarisch.

**Is het geschikt voor kinderen?**
Alles kan mild. Saté met witte rijst en een gebakken ei is de favoriet, sambal doen we apart.

**Hoe zit het met allergieën?**
Pinda zit in de satésaus en in de gado-gado, verder nergens. Gluten zitten in ketjap en bami. Zeg het bij de bestelling, dan zeggen we precies wat kan.

**Hoe zit het met de verpakking?**
Alles gaat in bakjes die je thuis nog een keer kunt gebruiken. Neem je je eigen pannetje mee, dan vullen we dat net zo graag.

---

### 5.3 Catering `/catering`

**Title tag:** Indonesische catering in Haarlem – rijsttafel | Oost
**Meta description:** Rijsttafel of Indonesisch buffet voor je verjaardag, borrel, bruiloft of bedrijfslunch in Haarlem en omgeving. Vers gekookt, vanaf tien personen.

#### Section 1 — Hero
- **Component:** hero with H1, one paragraph, two buttons. One scrolls to the form, one opens WhatsApp.

**H1:** Rijsttafel catering voor je feest

Een rijsttafel is bedoeld om te delen, dus het is nogal logisch dat we hem ook buiten de deur koken. Indonesische catering in Haarlem en omgeving, voor verjaardagen, borrels, bruiloften en bedrijfslunches, vanaf tien personen. Je haalt het op, of wij komen het brengen en zetten het klaar. Het is hetzelfde eten als op onze menukaart, uit dezelfde keuken, alleen in grotere pannen.

[Vraag een offerte aan] [App ons]

#### Section 2 — Wat we maken
- **Component:** four cards, each with a bold title and one paragraph. One closing line under the grid.

**H2:** Rijsttafel catering: wat we maken

**Rijsttafel buffet.** Het Indonesische buffet zoals je het kent: rendang, saté, ajam pedis, gado-gado, sambal goreng boontjes, tempé, sajoer lodeh, nasi en bami, met kroepoek, atjar en sambal. Acht tot twaalf schaaltjes, afhankelijk van hoeveel mensen er komen. Warm afgeleverd in bakken die zo op tafel kunnen, met een kaartje bij elk gerecht wat het is en of het pittig is. Vanaf € [27,50] per persoon.

**Lunchbox.** Nasi rames per persoon in een doos: vijf gerechten, rijst, kroepoek, en een lepel sambal apart. Voor kantoor en vergaderingen, omdat iedereen dan z'n eigen doos heeft en niemand hoeft op te scheppen. Vegetarische dozen krijgen een sticker. Vanaf € [16,50] per persoon.

**Saté en lumpia voor de borrel.** Stokjes van de grill en lumpia's, met pindasaus en sambal. Per stuk, zo veel als je wilt. Kan naast de bitterballen. Kan ook in plaats van.

**Spekkoek.** Een hele voor bij de koffie, of per plak verpakt om aan je gasten mee te geven.

Vegetarisch en zonder noten kan allebei. Zeg het erbij, dan koken we het apart.

#### Section 3 — Hoeveel heb je nodig
- **Component:** plain text block.

**H2:** Hoeveel heb je nodig

Bij een rijsttafel rekenen we ruim, omdat mensen twee keer opscheppen en er toch altijd iemand is die nog een derde keer gaat. Er blijft dan wat over voor de volgende dag, en daar hoor je nooit iemand over klagen. Voor een borrel is drie tot vier stokjes saté en twee lumpia's per persoon genoeg naast andere hapjes, het dubbele als het de maaltijd vervangt. Twijfel je, bel dan even, dan rekenen we het samen uit.

#### Section 4 — Catering in Haarlem en omgeving
- **Component:** text block, optional map with the towns marked.

**H2:** Catering in Haarlem en omgeving

Heel Haarlem, en daaromheen: Heemstede, Bloemendaal, Overveen, Aerdenhout, Zandvoort, Spaarndam, Hoofddorp en Velserbroek. Verder weg kan, in overleg. Bezorgen en klaarzetten doen we vanaf twintig personen. Daaronder haal je het bij ons op, warm en ingepakt.

#### Section 5 — Hoe het gaat, with quote form
- **Component:** two columns. Left: H2 and paragraph. Right: form with the fields below and one submit button, then one line under the form.

**H2:** Hoe het gaat

Vertel ons de datum, hoeveel gasten er komen en of er vegetariërs bij zijn. Binnen een dag heb je een voorstel met prijs. Bevestigen doe je met een appje. Een week van tevoren is fijn, in de zomer en rond de feestdagen liever twee. Betalen kan achteraf op factuur, ook als je het privé bestelt.

**Form fields:** Naam · E-mail · Telefoon · Datum · Aantal gasten · Waar (Haarlem, of daarbuiten?) · Wat had je in gedachten?
**Submit:** Vraag een offerte aan

Liever eerst even bellen? 023-7851562.

#### Section 6 — Veelgestelde vragen
- **Component:** accordion.

**H2:** Veelgestelde vragen

**Wat is het minimum?**
Tien personen voor afhalen, twintig voor bezorgen en klaarzetten.

**Brengen jullie ook borden en bestek?**
Nee, alleen het eten, in schalen die op tafel kunnen, met opscheplepels. Borden en warmhouders kunnen we regelen tegen kostprijs als je dat wilt.

**Kan het ook 's middags, voor een lunch?**
Ja. Lunchboxen en het buffet kunnen vanaf 11:30, ook op dagen dat het restaurant pas 's avonds open is.

**Wat als er meer mensen komen dan gepland?**
Tot twee dagen van tevoren passen we het gewoon aan. Daarna doen we ons best. Meestal lukt het.

**Doen jullie ook bruiloften?**
Ja, tot een stuk of [tachtig] gasten. Een rijsttafel als avondeten na de ceremonie werkt goed: lange tafels, alles in het midden, en niemand hoeft te kiezen.

---

### 5.4 Over ons `/over-ons`

**Title tag:** De familie achter Oost – Indonesisch restaurant in Haarlem
**Meta description:** Oost is het restaurant van Nijne en Levy. Lees hoe [oma]'s Indonesische recepten van [plaats] naar Haarlem kwamen, en wie er in de keuken staat.

#### Section 1 — Hero
- **Component:** simple page header with H1 over a full-width photo of the two owners at the table.

**H1:** De familie achter Oost

#### Section 2 — Waarom Oost
- **Component:** text beside an image of the recipe notebook.

**H2:** Waarom Oost

Oost heet Oost omdat het daar begon. "De Oost", zo bleef [oma] Indonesië noemen, ook na [vijftig] jaar in Nederland, en ook als je haar verbeterde. De recepten kwamen mee, in haar hoofd en in een schrift dat inmiddels uit elkaar valt. Dat schrift ligt nu in onze keuken in Haarlem, in een plastic hoesje, en niemand mag het meenemen.

#### Section 3 — Wie er in de keuken staat
- **Component:** longer text block with one or two photos alongside, then two buttons.

**H2:** Wie er in de keuken staat

Wij zijn met z'n tweeën. [Naam] staat in de keuken, elke dag. [Naam] doet de zaal, de bestellingen, de telefoon en Instagram, dus als je een filmpje van de rendang voorbij ziet komen, weet je van wie. De sambal proeven we allebei, en dat duurt meestal even, want we zijn het zelden meteen eens. [Oma] komt op [dinsdag] langs om te controleren of we niets veranderd hebben.

We zijn geen keten en we zijn geen foodhall. We zijn twee mensen met een keuken in Haarlem en we koken wat we thuis ook koken (→ menukaart), in dezelfde hoeveelheden sambal. Op zondag is dat meestal een rijsttafel, en dat is hier niet anders. Dat betekent ook dat de rendang soms op is. Dan is hij op. Morgen staat er weer een pan.

Kinderen zijn welkom, ook als ze hard zijn. Wij hebben er zelf geen, dus we vinden het alleen maar gezellig.

Kom langs. We schuiven een stoel bij.

[Reserveer een tafel] [Bekijk de menukaart]

---

## 6. Photography placeholders

All real photos, no stock. Label each image placeholder with one of these:
- The kitchen, mid-service
- [Oma]'s recipe notebook in its plastic sleeve
- Hands threading saté
- The two owners at the table
- A full rijsttafel on the table, shot from above
- Dish close-ups: rendang, saté ajam, gado-gado, nasi goreng, spekkoek

Alt text names the person and the dish.

---

## 7. Keyword map (reference only, do not add keywords to the copy)

| Page | Owns | Also carries naturally |
|---|---|---|
| `/` | indonesisch restaurant haarlem · rijsttafel haarlem · familierestaurant | every dish + haarlem · indonesisch eten haarlem · kindvriendelijk · zondag |
| `/afhalen` | indonesisch afhalen haarlem · rijsttafel afhalen haarlem | nasi goreng afhalen · saté afhalen · zondag · vegetarisch afhalen |
| `/catering` | indonesische catering haarlem · rijsttafel catering | buffet · bedrijfslunch · verjaardag |
| `/over-ons` | familierestaurant haarlem · de Oost | brand |

Each page says its own phrase in the title, the H1 and the first paragraph, then never forces it again.
