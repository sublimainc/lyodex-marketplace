/**
 * Freeze-dried retail storefronts surveyed for the LyoDex price dataset.
 *
 * `country` is the seller's home market. It is not used to infer currency —
 * several Canadian and European stores price in USD — the currency is read from
 * each store's own /cart.js instead.
 *
 * `wholeStoreFd: true` means every product the store sells is freeze-dried, so
 * a product does not need the words "freeze dried" in its title to qualify.
 * These sellers usually just write "Strawberries".
 */
export const STORES = [
  // ── Canada ──
  { domain: "happyyak.ca",                  name: "Happy Yak",                    country: "CA", wholeStoreFd: true },
  { domain: "supremefreezedry.com",         name: "Supreme Freeze Dry",           country: "CA", wholeStoreFd: true },
  { domain: "sublima.co",                   name: "Sublima",                      country: "CA", wholeStoreFd: true },
  { domain: "mounttrail.com",               name: "Mount Trail",                  country: "CA" },
  { domain: "spryactive.ca",                name: "Spry Active",                  country: "CA" },
  { domain: "nutricraft.ca",                name: "NutriCraft",                   country: "CA" },
  { domain: "freezedriedcandyco.ca",        name: "Freeze Dried Candy Co",        country: "CA", wholeStoreFd: true },
  { domain: "thefreezedryco.ca",            name: "The Freeze Dry Co",            country: "CA", wholeStoreFd: true },
  { domain: "lyoetco.ca",                   name: "Lyo & Co",                     country: "CA", wholeStoreFd: true },
  { domain: "zyo.ca",                       name: "Zyo",                          country: "CA" },
  { domain: "lyo-alimentation.ca",          name: "LYO Alimentation",             country: "CA", wholeStoreFd: true },
  { domain: "marche.simplitude.ca",         name: "Marché Simplitude",            country: "CA" },

  // ── United States — bulk / long-term storage ──
  { domain: "valleyfoodstorage.com",        name: "Valley Food Storage",          country: "US" },
  { domain: "shelf2table.com",              name: "Shelf 2 Table",                country: "US" },
  { domain: "freezendried.com",             name: "Freeze N Dried",               country: "US", wholeStoreFd: true },
  { domain: "freezedrywholesalers.com",     name: "Freeze Dry Wholesalers",       country: "US", wholeStoreFd: true },
  { domain: "motherearthproducts.com",      name: "Mother Earth Products",        country: "US" },
  { domain: "nutristorefoods.com",          name: "Nutristore",                   country: "US" },
  { domain: "augasonfarms.com",             name: "Augason Farms",                country: "US" },
  { domain: "thrivelife.com",               name: "Thrive Life",                  country: "US" },
  { domain: "readywise.com",                name: "ReadyWise",                    country: "US" },
  { domain: "mountainhouse.com",            name: "Mountain House",               country: "US", wholeStoreFd: true },
  { domain: "nutrientsurvival.com",         name: "Nutrient Survival",            country: "US" },
  { domain: "harmonyhousefoods.com",        name: "Harmony House Foods",          country: "US" },
  { domain: "northbaytrading.com",          name: "North Bay Trading",            country: "US" },

  // ── United States — outdoor / expedition meals ──
  { domain: "peakrefuel.com",               name: "Peak Refuel",                  country: "US", wholeStoreFd: true },
  { domain: "backpackerspantry.com",        name: "Backpacker's Pantry",          country: "US" },
  { domain: "packitgourmet.com",            name: "Packit Gourmet",               country: "US" },
  { domain: "goodto-go.com",                name: "Good To-Go",                   country: "US" },
  { domain: "heatherschoice.com",           name: "Heather's Choice",             country: "US" },
  { domain: "stowaway.com",                 name: "Stowaway Gourmet",             country: "US" },

  // ── United States — candy / novelty snack ──
  { domain: "thefreezedriedcandystore.com", name: "The Freeze Dried Candy Store", country: "US", wholeStoreFd: true },
  { domain: "rocketkrunch.com",             name: "Rocket Krunch",                country: "US", wholeStoreFd: true },
  { domain: "bingcofd.com",                 name: "Bingco",                       country: "US", wholeStoreFd: true },
  { domain: "freezedrieddepot.com",         name: "Freeze Dried Depot",           country: "US", wholeStoreFd: true },
  { domain: "milehisweetsandtreats.com",    name: "Mile Hi Sweets and Treats",    country: "US" },
  { domain: "sweetytreatyco.com",           name: "SweetyTreatyCo",               country: "US" },
  { domain: "arcticfarms.com",              name: "Arctic Farms",                 country: "US", wholeStoreFd: true },
  { domain: "brainfreezecandy.com",         name: "Brain Freeze Candy",           country: "US", wholeStoreFd: true },
  { domain: "yumyumcandyshop.com",          name: "Yum Yum Candy Shop",           country: "US" },
  { domain: "crunchdried.com",              name: "Crunch Dried",                 country: "US", wholeStoreFd: true },

  // ── Europe ──
  { domain: "cooknrun.com",                 name: "Cook'n'Run",                   country: "FR" },
  { domain: "lyophilise.co.uk",             name: "Lyophilise & Co",              country: "GB" },
  { domain: "freezedriedandco.com",         name: "Freezedried & Co",             country: "GB" },
  { domain: "expeditionfoods.com",          name: "Expedition Foods",             country: "GB", wholeStoreFd: true },
  { domain: "summittoeat.com",              name: "Summit to Eat",                country: "GB", wholeStoreFd: true },
  { domain: "lyofood.com",                  name: "LyoFood",                      country: "PL", wholeStoreFd: true },
  { domain: "lyovit.com",                   name: "Lyovit",                       country: "PL", wholeStoreFd: true },
  { domain: "tacticalfoodpack.com",         name: "Tactical Foodpack",            country: "EE", wholeStoreFd: true },
  { domain: "adventurefood.com",            name: "Adventure Food",               country: "NL", wholeStoreFd: true },
  { domain: "realturmat.no",                name: "Real Turmat",                  country: "NO", wholeStoreFd: true },
  { domain: "trek-n-eat.de",                name: "Trek'n Eat",                   country: "DE", wholeStoreFd: true },
  { domain: "firepot.co.uk",                name: "Firepot",                      country: "GB" },

  // ── Oceania ──
  { domain: "radixnutrition.com",           name: "Radix Nutrition",              country: "NZ", wholeStoreFd: true },
  { domain: "backcountrycuisine.co.nz",     name: "Back Country Cuisine",         country: "NZ", wholeStoreFd: true },
  { domain: "camperspantry.com.au",         name: "Campers Pantry",               country: "AU" },
  { domain: "freezedryindustries.com.au",   name: "Freeze Dry Industries",        country: "AU", wholeStoreFd: true },
];
