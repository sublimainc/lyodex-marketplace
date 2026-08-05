# Freeze-dried retail pricing — observed dataset

Built 2026-08-05 from the public catalogues of 32 storefronts.

| | |
|---|---|
| Storefronts surveyed | 58 |
| Storefronts that yielded data | 32 |
| Product/variant rows | 3067 |
| Rows with a price per kg | 2632 |
| Rows with no published weight | 310 |
| Rows behind the figures below | 507 |

Every price and weight below was read from the merchant's own listing. Nothing is
estimated. Where a merchant does not publish a net weight, the row keeps its price
and has no price per kg — that gap is left visible rather than filled in.

Currency converted to CAD at mid-market rates of 2026-08-05:
CAD 1 · USD 1.37 · EUR 1.49 · GBP 1.74 · AUD 0.89 · NZD 0.82 · PLN 0.35

## Price per kilogram by category (CAD)

Median, not average: a handful of single-serve candy packs would otherwise drag the
figure somewhere no real buyer trades.

| Category | Observations | Vendors | Median | Low quartile | Min | Max |
|---|---:|---:|---:|---:|---:|---:|
| candy | 144 | 10 | **$192.04** | $118.64 | $43.63 | $464.82 |
| fruit | 143 | 16 | **$194.69** | $125.30 | $54.21 | $741.41 |
| meal | 51 | 5 | **$133.52** | $111.30 | $88.78 | $487.20 |
| meat | 37 | 4 | **$197.01** | $169.76 | $60.29 | $580.61 |
| vegetable | 35 | 9 | **$159.75** | $91.68 | $29.36 | $923.95 |
| other | 27 | 4 | **$80.79** | $79.36 | $11.32 | $249.23 |
| dairy | 25 | 4 | **$128.51** | $65.52 | $65.52 | $207.09 |
| powder | 17 | 4 | **$118.00** | $65.33 | $48.87 | $199.34 |
| beverage | 17 | 2 | **$73.72** | $61.42 | $61.42 | $173.83 |
| ice cream | 6 | 1 | **$271.44** | $239.44 | $207.44 | $308.91 |
| egg | 4 | 3 | **$152.98** | $114.50 | $80.00 | $320.63 |
| herb spice | 1 | 1 | **$91.60** | $91.60 | $91.60 | $91.60 |

## Vendors, cheapest median first (CAD/kg)

| Vendor | Country | Prices in | Rows | Median |
|---|---|---|---:|---:|
| Rocket Krunch | US | USD | 10 | $54.34 |
| Radix Nutrition | NZ | NZD | 44 | $65.43 |
| Valley Food Storage | US | USD | 3 | $69.82 |
| Yum Yum Candy Shop | US | USD | 4 | $88.58 |
| Shelf 2 Table | US | USD | 2 | $90.44 |
| Happy Yak | CA | CAD | 9 | $111.30 |
| Campers Pantry | AU | AUD | 10 | $114.54 |
| Zyo | CA | CAD | 21 | $125.00 |
| Supreme Freeze Dry | CA | USD | 15 | $144.67 |
| Expedition Foods | GB | GBP | 16 | $145.00 |
| SweetyTreatyCo | US | USD | 9 | $152.08 |
| Mother Earth Products | US | USD | 6 | $152.81 |
| LyoFood | PL | EUR | 87 | $163.90 |
| The Freeze Dried Candy Store | US | USD | 111 | $168.25 |
| Freeze Dry Wholesalers | US | USD | 18 | $172.99 |
| Bingco | US | USD | 18 | $174.82 |
| Arctic Farms | US | USD | 41 | $256.73 |
| Harmony House Foods | US | USD | 52 | $268.81 |
| Lyo & Co | CA | CAD | 29 | $270.00 |
| Freeze Dried Depot | US | USD | 2 | $452.59 |

## How the weight was established

The price is easy; the weight is the whole difficulty. Counts by source:

| Weight source | Rows |
|---|---:|
| shopify_shipping_weight | 2236 |
| variant_title | 406 |
| none | 310 |
| product_title | 61 |
| net_weight_declared | 37 |
| variant_title_x6 | 4 |
| variant_title_x4 | 2 |
| variant_title_x12 | 2 |
| product_title_x4 | 1 |
| product_title_x8 | 1 |
| product_title_x12 | 1 |
| product_title_x43 | 1 |
| net_weight_declared_x3 | 1 |
| net_weight_declared_x6 | 1 |
| net_weight_declared_x12 | 1 |
| product_title_x15 | 1 |
| variant_title_x15 | 1 |

Shopify publishes a `grams` field per variant. It is a shipping weight, not net
contents, and many merchants leave it at a placeholder — one Quebec store reports
5 g for both a freeze-dried chili and a $69 bear bag. Rows resting on that field
are marked low confidence and are excluded from every figure above.

## Collection status per storefront

| Vendor | Domain | Status | Rows |
|---|---|---|---:|
| Arctic Farms | arcticfarms.com | ok | 670 |
| Expedition Foods | expeditionfoods.com | ok | 553 |
| The Freeze Dried Candy Store | thefreezedriedcandystore.com | ok | 306 |
| Freeze Dry Wholesalers | freezedrywholesalers.com | ok | 248 |
| Radix Nutrition | radixnutrition.com | ok | 143 |
| Mountain House | mountainhouse.com | ok | 105 |
| LyoFood | lyofood.com | ok | 102 |
| Valley Food Storage | valleyfoodstorage.com | ok | 88 |
| Lyo & Co | lyoetco.ca | ok | 85 |
| Happy Yak | happyyak.ca | ok | 74 |
| Bingco | bingcofd.com | ok | 72 |
| ReadyWise | readywise.com | ok | 72 |
| Harmony House Foods | harmonyhousefoods.com | ok | 62 |
| Marché Simplitude | marche.simplitude.ca | ok | 53 |
| Mother Earth Products | motherearthproducts.com | ok | 43 |
| SweetyTreatyCo | sweetytreatyco.com | ok | 41 |
| Lyovit | lyovit.com | ok | 36 |
| Peak Refuel | peakrefuel.com | ok | 33 |
| Freeze Dried Depot | freezedrieddepot.com | ok | 32 |
| Shelf 2 Table | shelf2table.com | ok | 32 |
| Brain Freeze Candy | brainfreezecandy.com | ok | 27 |
| Mile Hi Sweets and Treats | milehisweetsandtreats.com | ok | 26 |
| Mount Trail | mounttrail.com | ok | 22 |
| Nutrient Survival | nutrientsurvival.com | ok | 22 |
| Zyo | zyo.ca | ok | 21 |
| Rocket Krunch | rocketkrunch.com | ok | 20 |
| Campers Pantry | camperspantry.com.au | ok | 18 |
| Supreme Freeze Dry | supremefreezedry.com | manual_transcription | 18 |
| Backpacker's Pantry | backpackerspantry.com | ok | 14 |
| Augason Farms | augasonfarms.com | ok | 11 |
| Yum Yum Candy Shop | yumyumcandyshop.com | ok | 11 |
| Cook'n'Run | cooknrun.com | ok | 7 |
| Adventure Food | adventurefood.com | no_feed | 0 |
| Back Country Cuisine | backcountrycuisine.co.nz | no_feed | 0 |
| Crunch Dried | crunchdried.com | no_feed | 0 |
| Firepot | firepot.co.uk | no_feed | 0 |
| Freezedried & Co | freezedriedandco.com | no_feed | 0 |
| Freeze Dried Candy Co | freezedriedcandyco.ca | no_feed | 0 |
| Freeze Dry Industries | freezedryindustries.com.au | no_feed | 0 |
| Freeze N Dried | freezendried.com | no_feed | 0 |
| Good To-Go | goodto-go.com | ok | 0 |
| Heather's Choice | heatherschoice.com | no_feed | 0 |
| LYO Alimentation | lyo-alimentation.ca | no_feed | 0 |
| Lyophilise & Co | lyophilise.co.uk | no_feed | 0 |
| North Bay Trading | northbaytrading.com | no_feed | 0 |
| NutriCraft | nutricraft.ca | no_feed | 0 |
| Nutristore | nutristorefoods.com | no_feed | 0 |
| Packit Gourmet | packitgourmet.com | no_feed | 0 |
| Real Turmat | realturmat.no | no_feed | 0 |
| Spry Active | spryactive.ca | ok | 0 |
| Stowaway Gourmet | stowaway.com | no_feed | 0 |
| Sublima | sublima.co | no_feed | 0 |
| Summit to Eat | summittoeat.com | no_feed | 0 |
| Supreme Freeze Dry | supremefreezedry.com | no_feed | 0 |
| Tactical Foodpack | tacticalfoodpack.com | no_feed | 0 |
| The Freeze Dry Co | thefreezedryco.ca | no_feed | 0 |
| Thrive Life | thrivelife.com | no_feed | 0 |
| Trek'n Eat | trek-n-eat.de | no_feed | 0 |

`no_feed` means the storefront publishes no machine-readable catalogue — it is a
statement about how the site is built, not about the merchant's prices.
