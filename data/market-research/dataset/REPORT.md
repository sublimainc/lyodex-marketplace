# Freeze-dried retail pricing — observed dataset

Built 2026-08-05 from the public catalogues of 67 storefronts.

| | |
|---|---|
| Storefronts surveyed | 124 |
| Storefronts that yielded data | 67 |
| Product/variant rows | 5440 |
| Rows with a price per kg | 3517 |
| Rows with no published weight | 1735 |
| Rows behind the figures below | 926 |

Every price and weight below was read from the merchant's own listing. Nothing is
estimated. Where a merchant does not publish a net weight, the row keeps its price
and has no price per kg — that gap is left visible rather than filled in.

Currency converted to CAD at mid-market rates of 2026-08-05:
CAD 1 · USD 1.37 · EUR 1.49 · GBP 1.74 · AUD 0.89 · NZD 0.82 · PLN 0.35 · MXN 0.075

## Price per kilogram by category (CAD)

Median, not average: a handful of single-serve candy packs would otherwise drag the
figure somewhere no real buyer trades.

| Category | Observations | Vendors | Median | Low quartile | Min | Max |
|---|---:|---:|---:|---:|---:|---:|
| candy | 249 | 15 | **$166.56** | $115.69 | $43.63 | $464.82 |
| fruit | 242 | 23 | **$177.75** | $125.59 | $54.21 | $741.41 |
| other | 172 | 10 | **$97.50** | $79.36 | $11.32 | $287.50 |
| meal | 58 | 8 | **$126.38** | $104.30 | $41.07 | $589.07 |
| meat | 55 | 7 | **$175.68** | $147.84 | $28.69 | $580.61 |
| vegetable | 45 | 14 | **$161.39** | $90.66 | $29.36 | $1,000.00 |
| dairy | 34 | 7 | **$140.39** | $96.76 | $65.52 | $962.80 |
| beverage | 30 | 3 | **$61.42** | $41.61 | $39.99 | $173.83 |
| powder | 18 | 5 | **$124.56** | $65.33 | $48.87 | $415.01 |
| herb spice | 10 | 3 | **$90.80** | $90.00 | $80.59 | $135.00 |
| egg | 7 | 4 | **$156.95** | $149.91 | $80.00 | $784.52 |
| ice cream | 6 | 1 | **$271.44** | $239.44 | $207.44 | $308.91 |

## Vendors, cheapest median first (CAD/kg)

| Vendor | Country | Prices in | Rows | Median |
|---|---|---|---:|---:|
| Wise By Nature | CA | CAD | 21 | $41.61 |
| Rocket Krunch | US | USD | 10 | $54.34 |
| Radix Nutrition | NZ | NZD | 44 | $65.43 |
| Valley Food Storage | US | USD | 3 | $69.82 |
| Texas Farmers Kitchen | US | USD | 4 | $72.53 |
| Yum Yum Candy Shop | US | USD | 4 | $88.58 |
| Shelf 2 Table | US | USD | 2 | $90.44 |
| Gredi Mexico | MX | MXN | 27 | $107.63 |
| UpTop Treats | US | USD | 1 | $110.57 |
| Campers Pantry | AU | AUD | 10 | $114.54 |
| Happy Yak | CA | CAD | 5 | $114.75 |
| Backpacker's Pantry Canada | CA | CAD | 18 | $117.88 |
| Zyo | CA | CAD | 21 | $125.00 |
| Fruvethy | MX | MXN | 189 | $127.50 |
| Willow & Fern Co Freeze Dried | US | USD | 32 | $143.97 |
| Supreme Freeze Dry | CA | USD | 15 | $144.67 |
| Expedition Foods | GB | GBP | 16 | $145.00 |
| SweetyTreatyCo | US | USD | 9 | $152.08 |
| Mother Earth Products | US | USD | 6 | $152.81 |
| Freeze Dry Wholesalers | US | USD | 15 | $161.39 |
| LyoFood | PL | EUR | 87 | $163.90 |
| Nature's Turn | US | USD | 4 | $164.93 |
| Safecastle | US | USD | 24 | $166.17 |
| Collations Frosty Snack | CA | CAD | 67 | $166.56 |
| The Freeze Dried Candy Store | US | USD | 111 | $168.25 |
| Bingco | US | USD | 18 | $174.82 |
| Flat Out Feasts | CA | CAD | 6 | $188.70 |
| Arctic Farms | US | USD | 39 | $225.49 |
| Harmony House Foods | US | USD | 52 | $268.81 |
| Lyo & Co | CA | CAD | 29 | $270.00 |
| MumNums | CA | CAD | 2 | $325.66 |
| Freeze Dried Depot | US | USD | 2 | $452.59 |
| Windwick Farm | CA | CAD | 31 | $466.67 |
| Lyoca | CA | CAD | 2 | $531.04 |

## How the weight was established

The price is easy; the weight is the whole difficulty. Counts by source:

| Weight source | Rows |
|---|---:|
| shopify_shipping_weight | 2583 |
| none | 1451 |
| variant_title | 757 |
| pack_size_unstated | 284 |
| product_title | 126 |
| net_weight_declared | 66 |
| variant_title_x6 | 34 |
| product_title_x6 | 27 |
| net_weight_declared_x6 | 19 |
| variant_title_x12 | 18 |
| variant_title_x2 | 15 |
| product_title_x12 | 8 |
| product_title_x10 | 6 |
| product_title_x8 | 5 |
| variant_title_x8 | 5 |
| variant_title_x4 | 4 |
| product_title_x16 | 4 |
| product_title_x3 | 4 |
| variant_title_x16 | 4 |
| product_title_x4 | 3 |
| variant_title_x24 | 3 |
| product_title_x43 | 2 |
| net_weight_declared_x12 | 2 |
| variant_title_x15 | 2 |
| product_title_x5 | 2 |
| product_title_x22 | 2 |
| net_weight_declared_x3 | 1 |
| variant_title_x30 | 1 |
| product_title_x15 | 1 |
| product_title_x24 | 1 |

Shopify publishes a `grams` field per variant. It is a shipping weight, not net
contents, and many merchants leave it at a placeholder — one Quebec store reports
5 g for both a freeze-dried chili and a $69 bear bag. Rows resting on that field
are marked low confidence and are excluded from every figure above.

## Collection status per storefront

| Vendor | Domain | Status | Rows |
|---|---|---|---:|
| Arctic Farms | arcticfarms.com | ok | 670 |
| Expedition Foods | expeditionfoods.com | ok | 553 |
| ReadyWise | readywise.com | ok | 331 |
| The Freeze Dried Candy Store | thefreezedriedcandystore.com | ok | 306 |
| Safecastle | safecastle.com | ok | 253 |
| Freeze Dry Wholesalers | freezedrywholesalers.com | ok | 248 |
| Fruvethy | tiendafruvethy.com | ok | 245 |
| Sweet Dees | sweetdees.ca | ok | 196 |
| Radix Nutrition | radixnutrition.com | ok | 143 |
| Windwick Farm | windwickfarm.ca | ok | 143 |
| Freeze N Dried | freezendried.com | ok | 118 |
| Mountain House | mountainhouse.com | ok | 105 |
| Collations Frosty Snack | frostysnack.com | ok | 102 |
| LyoFood | lyofood.com | ok | 102 |
| Valley Food Storage | valleyfoodstorage.com | ok | 88 |
| Texas Farmers Kitchen | texasfarmerskitchen.com | ok | 87 |
| Lyo & Co | lyoetco.ca | ok | 85 |
| Nature's Turn | naturesturn.com | ok | 81 |
| Fresh Is Best | freshisbest.com | ok | 78 |
| Happy Yak | happyyak.ca | ok | 74 |
| Bingco | bingcofd.com | ok | 72 |
| MumNums | mumnums.ca | ok | 65 |
| Harmony House Foods | harmonyhousefoods.com | ok | 62 |
| Willow & Fern Co Freeze Dried | willowferncofreezedried.com | ok | 60 |
| Gredi Mexico | gredi.com.mx | ok | 55 |
| Chill Bites | chillbitesfood.com | ok | 54 |
| Backpacker's Pantry | backpackerspantry.com | ok | 53 |
| Marché Simplitude | marche.simplitude.ca | ok | 53 |
| Backpacker's Pantry Canada | backpackerspantry.ca | ok | 52 |
| RGV Freeze Dried Treats | rgvfreezedried.com | ok | 50 |
| FOUNDATION Outdoors | foundation-outdoors.com | ok | 45 |
| Treatly Freeze Dried Food | treatlyfreezedriedfood.com | ok | 45 |
| Mother Earth Products | motherearthproducts.com | ok | 43 |
| SweetyTreatyCo | sweetytreatyco.com | ok | 41 |
| UpTop Treats | uptoptreats.com | ok | 39 |
| Lyovit | lyovit.com | ok | 36 |
| Wise By Nature | wisebynature.com | ok | 34 |
| Peak Refuel | peakrefuel.com | ok | 33 |
| Pure Bliss | pure-bliss.ca | ok | 33 |
| Freeze Dried Depot | freezedrieddepot.com | ok | 32 |
| Shelf 2 Table | shelf2table.com | ok | 32 |
| Brain Freeze Candy | brainfreezecandy.com | ok | 27 |
| Mile Hi Sweets and Treats | milehisweetsandtreats.com | ok | 26 |
| Outdoor Pantry | outdoorpantry.com | ok | 26 |
| Farm to Summit | farmtosummit.com | ok | 24 |
| Candy Frost | candyfrost.ca | ok | 23 |
| Lolli Lane Sugar & Co | lollilane.com | ok | 23 |
| Mount Trail | mounttrail.com | ok | 22 |
| Northern Lights Candy | northernlightscandy.ca | ok | 22 |
| Nutrient Survival | nutrientsurvival.com | ok | 22 |
| Zyo | zyo.ca | ok | 21 |
| Rocket Krunch | rocketkrunch.com | ok | 20 |
| Pinnacle Foods Co | pinnaclefoods.co | ok | 19 |
| Campers Pantry | camperspantry.com.au | ok | 18 |
| LIOZ Dulces Liofilizados | dulcesliofilizados.com | ok | 18 |
| Supreme Freeze Dry | supremefreezedry.com | manual_transcription | 18 |
| Freeze Dried Food Store USA | freezedriedfoodstore.com | ok | 16 |
| Forever Foods | foreverfoods.ca | ok | 13 |
| Augason Farms | augasonfarms.com | ok | 11 |
| Backcountry Bistro | backcountrybistro.com | ok | 11 |
| Next Mile Meals | nextmilemeals.com | ok | 11 |
| Yum Yum Candy Shop | yumyumcandyshop.com | ok | 11 |
| LioMart | liomart.mx | ok | 10 |
| Sublima | sublima.co | ok | 9 |
| Lyoca | lyoca.com | ok | 8 |
| Cook'n'Run | cooknrun.com | ok | 7 |
| Flat Out Feasts | flatoutfeasts.ca | ok | 7 |
| Adventure Food | adventurefood.com | no_feed | 0 |
| Back Country Cuisine | backcountrycuisine.co.nz | no_feed | 0 |
| Big Lake Candy Company | biglakecandy.com | unsupported_platform | 0 |
| Briden Solutions | bridensolutions.ca | unsupported_platform | 0 |
| Canadian Tire | canadiantire.ca | excluded_marketplace | 0 |
| Candeeze | candeeze.co | unsupported_platform | 0 |
| Chewy | chewy.com | excluded_marketplace | 0 |
| Crunch Dried | crunchdried.com | no_feed | 0 |
| Cut N' Dry | cutndry.ca | empty | 0 |
| Firepot | firepot.co.uk | no_feed | 0 |
| Freezedried & Co | freezedriedandco.com | no_feed | 0 |
| Freeze Dried Candy Co | freezedriedcandyco.ca | no_feed | 0 |
| Freeze Dry Industries | freezedryindustries.com.au | no_feed | 0 |
| Freezy Bites | freezybites.com.mx | unsupported_platform | 0 |
| Frixio | frixio.com.mx | unsupported_platform | 0 |
| Good To-Go | goodto-go.com | ok | 0 |
| Heather's Choice | heatherschoice.com | no_feed | 0 |
| Just Freeze It Sweets | justfreezeitsweets.ca | unsupported_platform | 0 |
| AlpineAire Foods | katadyngroup.com | unsupported_platform | 0 |
| KMP Provisions | kmpprovisions.com | unsupported_platform | 0 |
| Like 'N Candy | likencandy.com | unsupported_platform | 0 |
| Procesadora de Alimentos CA | liofilizacion.com.mx | unsupported_platform | 0 |
| LioMex | liofilizacionmexicana.com | unsupported_platform | 0 |
| MercadoLibre Mexico | listado.mercadolibre.com.mx | excluded_marketplace | 0 |
| Gun Kan | loxpc.com.mx | unsupported_platform | 0 |
| LYO Alimentation | lyo-alimentation.ca | no_feed | 0 |
| Lyophilise & Co | lyophilise.co.uk | no_feed | 0 |
| Nomada Alimentos | nomadaalimentos.com.mx | unsupported_platform | 0 |
| North Bay Trading | northbaytrading.com | no_feed | 0 |
| NUTRIAM | nutriam.mx | unsupported_platform | 0 |
| NutriCraft | nutricraft.ca | no_feed | 0 |
| Nutristore | nutristorefoods.com | no_feed | 0 |
| Packit Gourmet | packitgourmet.com | no_feed | 0 |
| Petco | petco.com | excluded_marketplace | 0 |
| Polar Bear Bites | polarbearbites.com | unsupported_platform | 0 |
| Polar Pieces | polarpieces.com | unsupported_platform | 0 |
| Prairie Rose Pantry | prairierosepantry.ca | unsupported_platform | 0 |
| Real Turmat | realturmat.no | no_feed | 0 |
| REI Co-op | rei.com | excluded_marketplace | 0 |
| Sadie's All Natural | sadiesallnatural.com | unsupported_platform | 0 |
| Space City Candy | spacecitycandy.com | unsupported_platform | 0 |
| Spry Active | spryactive.ca | ok | 0 |
| 70 Below Treats | store.70below.ca | unsupported_platform | 0 |
| Stowaway Gourmet | stowaway.com | no_feed | 0 |
| Summit to Eat | summittoeat.com | no_feed | 0 |
| Supreme Freeze Dry | supremefreezedry.com | no_feed | 0 |
| Sweet AZ Candy | sweetazcandy.com | unsupported_platform | 0 |
| Tactical Foodpack | tacticalfoodpack.com | no_feed | 0 |
| The Candy Galaxy | thecandygalaxy.com | ok | 0 |
| The Freeze Dry Co | thefreezedryco.ca | no_feed | 0 |
| The Manic Maker | themanicmaker.ca | unsupported_platform | 0 |
| Thrive Life | thrivelife.com | no_feed | 0 |
| Trailtopia | trailtopia.com | unsupported_platform | 0 |
| Trek'n Eat | trek-n-eat.de | no_feed | 0 |
| Walmart Canada | walmart.ca | excluded_marketplace | 0 |
| Walmart US | walmart.com | excluded_marketplace | 0 |
| Wellioo | wellioo.ca | ok | 0 |

`no_feed` means the storefront publishes no machine-readable catalogue — it is a
statement about how the site is built, not about the merchant's prices.
