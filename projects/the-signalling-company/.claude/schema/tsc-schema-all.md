# TSC — Full JSON-LD Schema (paste-ready)

> Slug: `tsc-launch-metadata-schema` · Generated 2026-07-15 · Staging only.
> Canonical domain used in `@id`/`url`: `https://www.thesignallingcompany.com`.
> Settled facts only — Organization omits numberOfEmployees, founder, ">250 years", and sameAs (LinkedIn unconfirmed).

## Human-input flags
- **Organization `logo`** — ✅ confirmed by Will: horizontal stacked light-blue SVG wordmark.
- **Organization `sameAs`** — ✅ confirmed by Will: company LinkedIn. (X/YouTube still none.)
- **VideoObject** — still omitted: homepage hero videos are ambient loops with unknown `uploadDate`.

---

## Static pages

> These are **already live** on staging (applied via the schema-markup API to each
> page's settings JSON-LD field). The blocks below are `<script>`-wrapped so they can
> also be pasted straight into **Page settings → Custom code → head** if you ever need
> to re-apply manually. If pasting into the Webflow *JSON-LD schema* field instead, drop
> the surrounding `<script>` tags and paste the raw JSON only.

### `/` — page id `6a32b71aa48adbce92029386`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.thesignallingcompany.com/#webpage",
      "url": "https://www.thesignallingcompany.com/",
      "name": "The Signalling Company: Software-Defined ATP for Rail",
      "description": "100% software-defined Automatic Train Protection. ETCS, Class B, and RailOS. The open platform for railway signalling. Proven on 109+ locomotives across Europe.",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "about": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.thesignallingcompany.com/"
        }
      ]
    },
    {
      "@type": "Organization",
      "@id": "https://www.thesignallingcompany.com/#organization",
      "name": "The Signalling Company",
      "legalName": "The Signalling Company SRL",
      "url": "https://www.thesignallingcompany.com/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://cdn.prod.website-files.com/6a32b717a48adbce92029295/6a574265c118f2695134fafe_TSC%20Logo%20Horizontal%20Stacked%20Light%20Blue%202.svg"
      },
      "foundingDate": "2019",
      "parentOrganization": {
        "@type": "Organization",
        "name": "Škoda Group"
      },
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Rue des Deux Gares 82, Building B",
        "addressLocality": "Anderlecht",
        "addressRegion": "Brussels",
        "postalCode": "1070",
        "addressCountry": "BE"
      },
      "telephone": "+32 2 882 59 00",
      "email": "info@thesignallingcompany.com",
      "vatID": "BE0724.925.936",
      "identifier": {
        "@type": "PropertyValue",
        "propertyID": "VAT",
        "value": "BE0724.925.936"
      },
      "sameAs": [
        "https://www.linkedin.com/company/thesignallingcompany/"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://www.thesignallingcompany.com/#website",
      "name": "The Signalling Company",
      "url": "https://www.thesignallingcompany.com/",
      "publisher": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    }
  ]
}
</script>
```

### `/railos` — page id `6a3cdabc39b716990ae59d5b`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.thesignallingcompany.com/railos#webpage",
      "url": "https://www.thesignallingcompany.com/railos",
      "name": "RailOS: The Open Platform for Railway Signalling | TSC",
      "description": "RailOS is a certified, software-defined operating system for safety-critical railway applications. One platform for ETCS, Class B, ATO, TCMS, and data recording.",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "about": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.thesignallingcompany.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "RailOS",
          "item": "https://www.thesignallingcompany.com/railos"
        }
      ]
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://www.thesignallingcompany.com/railos#software",
      "name": "RailOS",
      "applicationCategory": "Railway signalling operating system",
      "operatingSystem": "RailOS",
      "description": "A certified, software-defined real-time operating system for safety-critical railway applications — one platform for ETCS, national Class B ATP, TCMS, and data recording.",
      "provider": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "offers": {
        "@type": "Offer",
        "availability": "https://schema.org/InStock",
        "priceCurrency": "EUR",
        "price": "0",
        "description": "Contact for pricing"
      }
    }
  ]
}
</script>
```

### `/products` — page id `6a3c3d8c7c565c90474777bc`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://www.thesignallingcompany.com/products#webpage",
      "url": "https://www.thesignallingcompany.com/products",
      "name": "Railway Signalling Products: ETCS, Class B ATP & Telecom | TSC",
      "description": "ETCS, PZB, KVB, TBL1, and Telecom Box. Software-defined railway signalling products from The Signalling Company. All built on the RailOS platform.",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "about": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.thesignallingcompany.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Products",
          "item": "https://www.thesignallingcompany.com/products"
        }
      ]
    }
  ]
}
</script>
```

### `/services` — page id `6a3bf0e3089ac37484064d59`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://www.thesignallingcompany.com/services#webpage",
      "url": "https://www.thesignallingcompany.com/services",
      "name": "Rail Signalling Services: Retrofit, Homologation & Maintenance | TSC",
      "description": "ETCS retrofit assessment, first-in-class homologation, series installation, training, and 10-year maintenance from The Signalling Company.",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "about": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.thesignallingcompany.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Services",
          "item": "https://www.thesignallingcompany.com/services"
        }
      ]
    }
  ]
}
</script>
```

### `/projects` — page id `6a3c2ed888e0859a0fad01f1`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://www.thesignallingcompany.com/projects#webpage",
      "url": "https://www.thesignallingcompany.com/projects",
      "name": "Customer Projects: ETCS Retrofit & New-Build | TSC",
      "description": "ETCS retrofit and new-build projects. Lineas freight fleet (109 locomotives), Škoda 27Ev hybrid trains, and Akiem BR189 pan-European assessment.",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "about": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.thesignallingcompany.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Projects",
          "item": "https://www.thesignallingcompany.com/projects"
        }
      ]
    }
  ]
}
</script>
```

### `/about` — page id `6a3c43199cadaf57ac09f955`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": "https://www.thesignallingcompany.com/about#webpage",
      "url": "https://www.thesignallingcompany.com/about",
      "name": "About The Signalling Company: Railway Signalling Innovator",
      "description": "Founded in 2019, acquired by Škoda Group in 2023. The Signalling Company develops RailOS. A modular, software-defined platform for international and national ATP.",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "about": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.thesignallingcompany.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "About",
          "item": "https://www.thesignallingcompany.com/about"
        }
      ]
    }
  ]
}
</script>
```

### `/leadership` — page id `6a3bee7dc1f94c42e8ce2d7f`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.thesignallingcompany.com/leadership#webpage",
      "url": "https://www.thesignallingcompany.com/leadership",
      "name": "Leadership Team: The Signalling Company",
      "description": "Meet the leadership team at The Signalling Company. Experienced rail signalling professionals driving software-defined ATP innovation across Europe.",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "about": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.thesignallingcompany.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Leadership",
          "item": "https://www.thesignallingcompany.com/leadership"
        }
      ]
    },
    {
      "@type": "ItemList",
      "name": "Leadership Team — The Signalling Company",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "item": {
            "@id": "https://www.thesignallingcompany.com/leadership/alexandre-betis#person"
          }
        },
        {
          "@type": "ListItem",
          "position": 2,
          "item": {
            "@id": "https://www.thesignallingcompany.com/leadership/benoit-blin#person"
          }
        },
        {
          "@type": "ListItem",
          "position": 3,
          "item": {
            "@id": "https://www.thesignallingcompany.com/leadership/fabienne-goutaudier#person"
          }
        },
        {
          "@type": "ListItem",
          "position": 4,
          "item": {
            "@id": "https://www.thesignallingcompany.com/leadership/raphael-kleinplac#person"
          }
        },
        {
          "@type": "ListItem",
          "position": 5,
          "item": {
            "@id": "https://www.thesignallingcompany.com/leadership/martin-kriz#person"
          }
        },
        {
          "@type": "ListItem",
          "position": 6,
          "item": {
            "@id": "https://www.thesignallingcompany.com/leadership/jarlath-lally#person"
          }
        },
        {
          "@type": "ListItem",
          "position": 7,
          "item": {
            "@id": "https://www.thesignallingcompany.com/leadership/stanislas-pinte#person"
          }
        },
        {
          "@type": "ListItem",
          "position": 8,
          "item": {
            "@id": "https://www.thesignallingcompany.com/leadership/benjamin-pischetola#person"
          }
        }
      ]
    },
    {
      "@type": "Person",
      "@id": "https://www.thesignallingcompany.com/leadership/alexandre-betis#person",
      "name": "Alexandre Betis",
      "jobTitle": "CEO",
      "image": "https://cdn.prod.website-files.com/6a32b71aa48adbce920293b8/6a573220ade93e56c322b9a3_6a568707b53197b10782dc5d_alexandre-betis.avif",
      "url": "https://www.thesignallingcompany.com/leadership/alexandre-betis",
      "worksFor": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      }
    },
    {
      "@type": "Person",
      "@id": "https://www.thesignallingcompany.com/leadership/benoit-blin#person",
      "name": "Benoit Blin",
      "jobTitle": "Head of Product Development",
      "image": "https://cdn.prod.website-files.com/6a32b71aa48adbce920293b8/6a5732c1d3ae16cf32835c24_6a568730ad7e0535534775bd_benoit-blin.avif",
      "url": "https://www.thesignallingcompany.com/leadership/benoit-blin",
      "worksFor": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      }
    },
    {
      "@type": "Person",
      "@id": "https://www.thesignallingcompany.com/leadership/fabienne-goutaudier#person",
      "name": "Fabienne Goutaudier",
      "jobTitle": "Head of Quality & System Assurance",
      "image": "https://cdn.prod.website-files.com/6a32b71aa48adbce920293b8/6a5732c1d3ae16cf32835c1a_6a5687321439428f3ba1d15c_fabienne-goutaudier.avif",
      "url": "https://www.thesignallingcompany.com/leadership/fabienne-goutaudier",
      "worksFor": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      }
    },
    {
      "@type": "Person",
      "@id": "https://www.thesignallingcompany.com/leadership/raphael-kleinplac#person",
      "name": "Raphaël Kleinplac",
      "jobTitle": "Head of HR & Facilities",
      "image": "https://cdn.prod.website-files.com/6a32b71aa48adbce920293b8/6a5732c1d3ae16cf32835c14_6a568732a08711fd7c532b50_raphael-kleinplac.avif",
      "url": "https://www.thesignallingcompany.com/leadership/raphael-kleinplac",
      "worksFor": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      }
    },
    {
      "@type": "Person",
      "@id": "https://www.thesignallingcompany.com/leadership/martin-kriz#person",
      "name": "Martin Kriz",
      "jobTitle": "Chief Administrative & Financial Officer",
      "image": "https://cdn.prod.website-files.com/6a32b71aa48adbce920293b8/6a5732c2d3ae16cf32835c2d_6a5687326ba752091cd75e18_martin-kriz.avif",
      "url": "https://www.thesignallingcompany.com/leadership/martin-kriz",
      "worksFor": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      }
    },
    {
      "@type": "Person",
      "@id": "https://www.thesignallingcompany.com/leadership/jarlath-lally#person",
      "name": "Jarlath Lally",
      "jobTitle": "Head of Sales, Marketing, and Product Management",
      "image": "https://cdn.prod.website-files.com/6a32b71aa48adbce920293b8/6a5732c1d3ae16cf32835c1d_6a568732d727c623e2c47256_jarlath-lally.avif",
      "url": "https://www.thesignallingcompany.com/leadership/jarlath-lally",
      "worksFor": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      }
    },
    {
      "@type": "Person",
      "@id": "https://www.thesignallingcompany.com/leadership/stanislas-pinte#person",
      "name": "Stanislas Pinte",
      "jobTitle": "RailOS Expert & Special Projects",
      "image": "https://cdn.prod.website-files.com/6a32b71aa48adbce920293b8/6a5732c1d3ae16cf32835c2a_6a568733ad7e05355347778c_stanislas-pinte.avif",
      "url": "https://www.thesignallingcompany.com/leadership/stanislas-pinte",
      "worksFor": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      }
    },
    {
      "@type": "Person",
      "@id": "https://www.thesignallingcompany.com/leadership/benjamin-pischetola#person",
      "name": "Benjamin Pischetola",
      "jobTitle": "Chief Delivery Officer",
      "image": "https://cdn.prod.website-files.com/6a32b71aa48adbce920293b8/6a5732c1d3ae16cf32835c17_6a568733bd125fda6937d96b_benjamin-pischetola.avif",
      "url": "https://www.thesignallingcompany.com/leadership/benjamin-pischetola",
      "worksFor": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      }
    }
  ]
}
</script>
```

### `/careers` — page id `6a3c4808cc3190243e64f747`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.thesignallingcompany.com/careers#webpage",
      "url": "https://www.thesignallingcompany.com/careers",
      "name": "Careers at The Signalling Company",
      "description": "Join The Signalling Company. We're building the future of railway signalling with RailOS — a software-defined, open platform for safety-critical rail applications.",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "about": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.thesignallingcompany.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Careers",
          "item": "https://www.thesignallingcompany.com/careers"
        }
      ]
    }
  ]
}
</script>
```

### `/news` — page id `6a3c47cfe98fcdef2925b70c`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://www.thesignallingcompany.com/news#webpage",
      "url": "https://www.thesignallingcompany.com/news",
      "name": "News & Insights: The Signalling Company",
      "description": "Latest news, insights, and press releases from The Signalling Company. Updates on ETCS projects, RailOS development, and railway signalling innovation.",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "about": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.thesignallingcompany.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "News & Insights",
          "item": "https://www.thesignallingcompany.com/news"
        }
      ]
    }
  ]
}
</script>
```

### `/faq` — page id `6a3c4e881cefcb295a3415d4`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.thesignallingcompany.com/faq#webpage",
      "url": "https://www.thesignallingcompany.com/faq",
      "name": "Frequently Asked Questions: The Signalling Company",
      "description": "Answers to common questions about ETCS, RailOS, software-defined ATP, Class B signalling, retrofit timelines, and The Signalling Company's services.",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "about": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.thesignallingcompany.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "FAQ",
          "item": "https://www.thesignallingcompany.com/faq"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "https://www.thesignallingcompany.com/faq#faqpage",
      "url": "https://www.thesignallingcompany.com/faq",
      "name": "Frequently Asked Questions: The Signalling Company",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "inLanguage": "en-GB",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is ETCS and why does my fleet need it?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "ETCS (European Train Control System) is the Control, Command and Signalling (CCS) system that has been standardised as part of the European Rail Traffic Management System (ETMS), now being adopted globally. It represents the most comprehensive and highest safety standard for rail transport, and is being mandated for installation on all new rail vehicles, and vehicle that need to undergo retrofit of their National Class B systems."
          }
        },
        {
          "@type": "Question",
          "name": "What role does RailOS play in TSC products?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "RailOS plays a similar role to Apple's iOS in the consumer space. It is a portable industrial real-time-operating-system (RTOS) that, like Apple iOS, supports an ecosystem of digital rail Applications ('Apps'), plug-and-play Devices, and an Open Development Program."
          }
        },
        {
          "@type": "Question",
          "name": "How long does an ETCS retrofit take per vehicle?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "TSC can install an ETCS system onboard in as few as 10 days per vehicle. Software updates take under 1 month and automated commissioning takes under 3 hours — significantly faster than traditional retrofit approaches."
          }
        },
        {
          "@type": "Question",
          "name": "Which countries does TSC's Class B ATP cover?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Our Class B ATP portfolio covers Belgium (TBL1), France (KVB), Germany, Austria, Romania, Serbia, and Croatia (PZB), and the UK, Poland, Czech Republic, and more via our universal wSTM solution."
          }
        },
        {
          "@type": "Question",
          "name": "What is the Open RailOS developer program?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Open RailOS invites third-party software developers to build applications on our certified safe computing platform. Developers can apply for one of two App Development Kits (ADKs): a General ADK for non-safety applications, or a Safe ADK for safety-critical applications."
          }
        },
        {
          "@type": "Question",
          "name": "Is TSC certified for safety-critical railway systems?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. RailOS and our ETCS application are SIL4-certified — the highest safety integrity level for railway signalling. Our systems have been assessed by independent notified bodies and approved by national safety authorities in Belgium, the Netherlands, and Germany."
          }
        },
        {
          "@type": "Question",
          "name": "How does a software-defined system handle safety certification?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The same way any SIL4 system does — through rigorous verification, validation, and independent assessment. The difference is that our safety case is designed for software evolution. When an application is updated, only the changed software component needs re-certification, not the entire system."
          }
        },
        {
          "@type": "Question",
          "name": "What happens when I need to operate in a new country?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "You deploy the relevant national ATP application (PZB for Germany, KVB for France, TBL1+ for Belgium) as a software package on your existing RailOS hardware. No new boxes, no new wiring, no new depot integration. The hardware stays the same."
          }
        },
        {
          "@type": "Question",
          "name": "How is TSC different from Alstom, Siemens, or Thales?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Those vendors build closed, proprietary systems where the hardware, software, and roadmap are controlled by the vendor. TSC's platform is open — software-defined, hardware-agnostic, and available to third-party developers. We also offer full lifecycle services from assessment through homologation to 10-year maintenance, so you're supported from day one to decade two."
          }
        },
        {
          "@type": "Question",
          "name": "TSC is a younger company. Why should I trust you with safety-critical systems?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Our founding team built ATP systems at Alstom, Bombardier, and other major OEMs before starting TSC. The collective experience is measured in decades, not years. TSC is part of the Škoda Group, providing corporate stability and manufacturing scale. And our systems are independently certified to the same SIL4 standard as every incumbent — the maths doesn't care who built it."
          }
        },
        {
          "@type": "Question",
          "name": "What does a typical ETCS retrofit project look like?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "We start with a fleet assessment to determine scope and compatibility. Then we manage the homologation process with the relevant national safety authority — the most complex part of any retrofit. Once approved, our team handles installation and commissioning. Typical timelines depend on fleet size and country requirements."
          }
        },
        {
          "@type": "Question",
          "name": "How does RailOS help manage ETCS Baseline updates?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "RailOS separates the safety-critical ETCS application layer from the hardware device layer. When a Baseline is updated we simply update our software, the underlying hardware remains untouched. RailOS was designed for low-cost and software-only adaptation to the ever evolving ETCS standard."
          }
        },
        {
          "@type": "Question",
          "name": "Can RailOS run third-party applications alongside TSC's own apps?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. The Application Developer Kit allows qualified third-party developers to build, test, and certify their own RailOS applications. Learn about Open RailOS."
          }
        },
        {
          "@type": "Question",
          "name": "What hardware does RailOS run on?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For ETCS and National Class B ATP Applications, RailOS runs on our iEVC, an off-the-shelf SIL4 computer for safety-critical applications. But it can ported to any computer and used for any Digital Rail application, be it on-board or trackside, safety-critical or non-safety critical. That is why we have an Open RailOS Development Program, RailOS can run any Digital Rail application."
          }
        },
        {
          "@type": "Question",
          "name": "How does RailOS handle interoperability between ETCS and national Class B systems?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "RailOS has allowed us to develop software-only STM (Specific Transmission Module) Apps. For reference, an STM is a technology, usually requiring proprietary hardware, that integrates ETCS and National Class B signalling (safety) logic so that trains can run without stopping between sections of track that are equipped with ETCS and sections that use the Class B technology. With a RailOS STM App, there is no need for separate STM hardware, simpifying ETCS-Class B integration and reducing installation, operation and maintenance costs."
          }
        },
        {
          "@type": "Question",
          "name": "What ETCS Baseline does TSC support?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Our ETCS application supports Baseline 3 and is available with Baseline 4 including ATO (Automatic Train Operation) as part of an integrated software upgrade. Because RailOS is software-defined, future Baseline updates are delivered as software packages — the onboard hardware remains unchanged."
          }
        },
        {
          "@type": "Question",
          "name": "Can I run ETCS and national Class B systems on the same hardware?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Our iEVC safe computer runs ETCS together with national Class B applications such as TBL1+ (Belgium), PZB (Germany, Austria, Romania, Serbia, Croatia), and KVB (France). The iSTM and wSTM apps manage interoperability between systems — no additional hardware required."
          }
        },
        {
          "@type": "Question",
          "name": "What is the Telecom Box?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The Telecom Box is a railway-hardened telecom gateway that supports GSM-R, 4G/5G, FRMCS, and satellite communications through a single ruggedised unit. It eliminates the need for multiple stand-alone telecom and GPS devices onboard, reducing hardware count, installation time, and lifetime maintenance costs."
          }
        },
        {
          "@type": "Question",
          "name": "Can TSC support a fleet operating across multiple European countries?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes — this is one of our core strengths. A single RailOS installation can run ETCS alongside multiple national Class B systems. The Lineas HLD77 project is a working example: 109 locomotives operating across Belgium, the Netherlands, and Germany with ETCS and up to three national ATP systems on the same hardware. Adding a new country is a software deployment, not a hardware installation."
          }
        },
        {
          "@type": "Question",
          "name": "How does a software-defined system protect against device obsolescence?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "RailOS uses standard, off-the-shelf Ethernet-connected devices rather than proprietary hardware. When a device becomes obsolete, it can be replaced with any compatible off-the-shelf alternative without triggering a system replacement or re-certification. The software stays the same — only the device is swapped. This plug-and-play approach protects your investment over the full operational lifetime of the fleet."
          }
        },
        {
          "@type": "Question",
          "name": "What does a retrofit viability assessment cover?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Our ETCS Retrofit Viability Assessment analyses the mechanical, electrical, and spatial constraints of your vehicle platform against the requirements of ETCS installation. The assessment covers weight budgets, cab space allocation, power supply integration, and a country-by-country certification roadmap. The Akiem BR189 project is a reference for this service."
          }
        },
        {
          "@type": "Question",
          "name": "Does TSC handle the full ETCS certification process?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Our first-in-class homologation service covers the complete V-Cycle from concept design to Authorization to Put In Service (APIS). We manage the entire process with the relevant national safety authority. The Škoda 27Ev project is a reference — TSC delivered the first locomotive authorised with a software-defined safety platform."
          }
        },
        {
          "@type": "Question",
          "name": "What maintenance options does TSC offer post-installation?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "We offer post-warranty maintenance service packs for up to 10 years or longer. Each pack is configured for the unique operational needs of each client, with options spanning corrective, preventative, and predictive maintenance. Our Digital Journey Replay (DJR) app enables rapid remote troubleshooting of both onboard and trackside signalling issues."
          }
        },
        {
          "@type": "Question",
          "name": "Where is TSC headquartered?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Our headquarters are at Rue des Deux Gares 82/B, 1070 Brussels, Belgium. A short walk from Gare du Midi, a domestic and international rail hub. Our products and services are sold globally."
          }
        },
        {
          "@type": "Question",
          "name": "Is TSC part of a larger group?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. The Signalling Company is a Škoda Group Affiliate since 2023, extending the group's extensive portfolio of digital rail products & services to signalling and other application domains."
          }
        },
        {
          "@type": "Question",
          "name": "How many vehicles has TSC equipped with ETCS?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Our systems are currently in service on 109+ Lineas freight locomotives operating across Belgium, the Netherlands, and Germany. We are also supplying ETCS for 34 new-built Škoda 27Ev hybrid trains for RegioJet in the Czech Republic, and have completed a pan-European retrofit viability assessment for Akiem covering 10 countries. Our Universal ATP Platform (UAP) is being deployed for ETCS and National Class B applications for the Lineas HLD77 ETCS Fleet Retrofit Project and Skoda Transport’s new hybrid-power multiple-unit train, the 27Ev, destined for passenger services with RegioJet in the Czech Republic."
          }
        }
      ]
    }
  ]
}
</script>
```

### `/contact` — page id `6a3be09f11084282a39eb677`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ContactPage",
      "@id": "https://www.thesignallingcompany.com/contact#webpage",
      "url": "https://www.thesignallingcompany.com/contact",
      "name": "Contact Us: The Signalling Company",
      "description": "Get in touch with The Signalling Company. Headquarters: Rue des Deux Gares 82/B, 1070 Brussels, Belgium. Phone: +32 (0)2 882 59 00.",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "about": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.thesignallingcompany.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Contact",
          "item": "https://www.thesignallingcompany.com/contact"
        }
      ]
    }
  ]
}
</script>
```

### `/railos/app-store` — page id `6a3c49f7c64e95ac9808065a`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.thesignallingcompany.com/railos/app-store#webpage",
      "url": "https://www.thesignallingcompany.com/railos/app-store",
      "name": "RailOS App Store: The Signalling Company",
      "description": "Browse the RailOS App Store. Certified safety and data applications for railway signalling, train control, and fleet management.",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "about": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.thesignallingcompany.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "RailOS",
          "item": "https://www.thesignallingcompany.com/railos"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "RailOS App Store",
          "item": "https://www.thesignallingcompany.com/railos/app-store"
        }
      ]
    }
  ]
}
</script>
```

### `/railos/open` — page id `6a3c4ab5d7ecbd33ede251ed`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.thesignallingcompany.com/railos/open#webpage",
      "url": "https://www.thesignallingcompany.com/railos/open",
      "name": "Open RailOS: Developer Platform for Railway Apps | TSC",
      "description": "Build on RailOS. The Application Developer Kit enables third-party developers to create certified safety and non-safety railway applications.",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "about": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.thesignallingcompany.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "RailOS",
          "item": "https://www.thesignallingcompany.com/railos"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Open RailOS",
          "item": "https://www.thesignallingcompany.com/railos/open"
        }
      ]
    }
  ]
}
</script>
```

### `/railos/devices` — page id `6a3c39824cfab58d65dd04ff`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://www.thesignallingcompany.com/railos/devices#webpage",
      "url": "https://www.thesignallingcompany.com/railos/devices",
      "name": "RailOS Devices: Certified Hardware Ecosystem | TSC",
      "description": "Certified hardware devices for RailOS: iEVC safe computer, DMI, balise readers, Euroradio, odometry, and more. Plug-and-play, Ethernet-connected.",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "about": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.thesignallingcompany.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "RailOS",
          "item": "https://www.thesignallingcompany.com/railos"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "RailOS Devices",
          "item": "https://www.thesignallingcompany.com/railos/devices"
        }
      ]
    }
  ]
}
</script>
```

### `/railos/apps` — page id `6a3c37872f8739588e13dbe2`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://www.thesignallingcompany.com/railos/apps#webpage",
      "url": "https://www.thesignallingcompany.com/railos/apps",
      "name": "RailOS Apps: Safety & Data Applications | TSC",
      "description": "RailOS software applications for ETCS, Class B ATP, train recording, and fleet management. All running on the certified iEVC safe computing platform.",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "about": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.thesignallingcompany.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "RailOS",
          "item": "https://www.thesignallingcompany.com/railos"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "RailOS Apps",
          "item": "https://www.thesignallingcompany.com/railos/apps"
        }
      ]
    }
  ]
}
</script>
```

### `/privacy-policy` — page id `6a32b71aa48adbce920293a0`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.thesignallingcompany.com/privacy-policy#webpage",
      "url": "https://www.thesignallingcompany.com/privacy-policy",
      "name": "Privacy Policy: The Signalling Company",
      "description": "Privacy policy for The Signalling Company (TSC). Learn how we collect, process, and protect your personal data in compliance with GDPR.",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "about": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.thesignallingcompany.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Privacy Policy",
          "item": "https://www.thesignallingcompany.com/privacy-policy"
        }
      ]
    }
  ]
}
</script>
```

### `/cookie-policy-eu` — page id `6a3be32414ec0414cb2d6e60`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.thesignallingcompany.com/cookie-policy-eu#webpage",
      "url": "https://www.thesignallingcompany.com/cookie-policy-eu",
      "name": "Cookie Policy: The Signalling Company",
      "description": "Cookie policy for The Signalling Company website. Details on cookies used, consent management, and how to manage your preferences.",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "about": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.thesignallingcompany.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Cookie Policy",
          "item": "https://www.thesignallingcompany.com/cookie-policy-eu"
        }
      ]
    }
  ]
}
</script>
```

### `/disclaimer` — page id `6a3be303be1f45cb01e91b25`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.thesignallingcompany.com/disclaimer#webpage",
      "url": "https://www.thesignallingcompany.com/disclaimer",
      "name": "Disclaimer: The Signalling Company",
      "description": "Legal disclaimer for The Signalling Company website. Information about liability, intellectual property, and terms of use.",
      "isPartOf": {
        "@id": "https://www.thesignallingcompany.com/#website"
      },
      "about": {
        "@id": "https://www.thesignallingcompany.com/#organization"
      },
      "inLanguage": "en-GB"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.thesignallingcompany.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Disclaimer",
          "item": "https://www.thesignallingcompany.com/disclaimer"
        }
      ]
    }
  ]
}
</script>
```

---

## CMS template pages — ⚠️ REQUIRED MANUAL DESIGNER STEP

**Why manual:** the Webflow API cannot deliver per-item CMS schema. Build-time
discovery (2026-07-15) confirmed two dead ends: (a) the page **schema-markup API**
stores `{{wf}}` binding tokens but renders them **empty** (tested both `}` and `\}`
formats); (b) the **freeform-code API** returns **HTTP 406** for any `<script>` tag.
Pasting these blocks in the Designer works because Designer freeform head code DOES
resolve `{{wf}}` tokens inside `<script>`. Until then, item pages carry only the
site-wide WebSite node (no Product/Service/NewsArticle/SoftwareApplication).

**Per template:** open the template page → **Page settings → Custom code → Inside `<head>`**,
paste the block, save, publish. The `{{wf ...\} }}` tokens resolve to each item's fields.

### Products template (`/products/:slug`) — page id `6a3b8e51468af0c57a1dba6b`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{{wf {"path":"name","type":"PlainText"\} }}",
  "description": "{{wf {"path":"seo-title","type":"PlainText"\} }}",
  "brand": { "@type": "Organization", "name": "The Signalling Company", "@id": "https://www.thesignallingcompany.com/#organization" },
  "manufacturer": { "@id": "https://www.thesignallingcompany.com/#organization" },
  "category": "Railway signalling product"
}
</script>
```

### Services template (`/services/:slug`) — page id `6a3b8e52468af0c57a1dbaba`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "{{wf {"path":"name","type":"PlainText"\} }}",
  "name": "{{wf {"path":"name","type":"PlainText"\} }}",
  "description": "{{wf {"path":"meta-description","type":"PlainText"\} }}",
  "provider": { "@type": "Organization", "name": "The Signalling Company", "@id": "https://www.thesignallingcompany.com/#organization" },
  "areaServed": "Europe"
}
</script>
```

### RailOS Devices template (`/railos-devices/:slug`) — page id `6a3b8e52fc62a641b3f27c70`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{{wf {"path":"name","type":"PlainText"\} }}",
  "description": "{{wf {"path":"meta-description","type":"PlainText"\} }}",
  "image": "{{wf {"path":"thumbnail","type":"ImageRef"\} }}",
  "brand": { "@type": "Organization", "name": "The Signalling Company", "@id": "https://www.thesignallingcompany.com/#organization" },
  "manufacturer": { "@id": "https://www.thesignallingcompany.com/#organization" },
  "category": "Railway signalling device"
}
</script>
```

### News template (`/news/:slug`) — page id `6a32b71aa48adbce9202938f`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "{{wf {"path":"name","type":"PlainText"\} }}",
  "image": "{{wf {"path":"thumbnail","type":"ImageRef"\} }}",
  "datePublished": "{{wf {"path":"date","type":"Date"\} }}",
  "author": { "@type": "Organization", "name": "The Signalling Company", "@id": "https://www.thesignallingcompany.com/#organization" },
  "publisher": { "@type": "Organization", "name": "The Signalling Company", "@id": "https://www.thesignallingcompany.com/#organization", "logo": { "@type": "ImageObject", "url": "https://cdn.prod.website-files.com/6a32b717a48adbce92029295/6a574265c118f2695134fafe_TSC%20Logo%20Horizontal%20Stacked%20Light%20Blue%202.svg" } }
}
</script>
```

### Projects template (`/projects/:slug`) — page id `6a32b71aa48adbce920293a1`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "{{wf {"path":"name","type":"PlainText"\} }}",
  "image": "{{wf {"path":"thumbnail","type":"ImageRef"\} }}",
  "creator": { "@type": "Organization", "name": "The Signalling Company", "@id": "https://www.thesignallingcompany.com/#organization" },
  "about": "Railway signalling project"
}
</script>
```

### RailOS Apps template (`/railos-apps/:slug`) — page id `6a458cb63020a42432407ce8`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "{{wf {"path":"name","type":"PlainText"\} }}",
  "description": "{{wf {"path":"meta-description","type":"PlainText"\} }}",
  "applicationCategory": "Railway signalling application",
  "operatingSystem": "RailOS",
  "provider": { "@type": "Organization", "name": "The Signalling Company", "@id": "https://www.thesignallingcompany.com/#organization" }
}
</script>
```

