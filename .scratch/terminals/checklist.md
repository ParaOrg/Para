# OpenStreetMap jeepney and UV terminals with no Para terminal nearby

**Caveat: published terminals only.** This list compares against the terminals in the *published*
map (`public/data/index.v5.json`, 9 terminals on 2026-11-25). The studio's unpublished drafts are
not in it, so a few rows here may already be drafted. Check the studio before drawing.

Each row is a jeepney or UV Express terminal that OpenStreetMap has and Para does not: no Para
terminal hotspot within **300 m** of its point. That is about one long city block. A terminal's OSM
point can sit on the far side of its block or mall from where Para's box is drawn; past 300 m it is
plausibly a different terminal. The rule barely changes the count, since Para publishes so few
terminals yet. Each row is a likely missing route.

**How it was made** (2026-11-25, `.scratch/terminals` plan as approved): from
`public/data/terminals.v1.json`, whose rules are `scripts/terminals/terminal-file.mjs`:
- **Source:** Para's copy of the OpenStreetMap Philippines extract of 2026-11-23, cut to the map's
  panning box. © OpenStreetMap contributors, ODbL.
- **Candidates:** every `amenity=bus_station` or `jeepney_station`, `public_transport=station`
  (not rail, subway or ferry), or name with "Terminal".
- **Dropped:** `amenity=taxi`, `highway=bus_stop`, and names with tricycle, TODA, pedicab, taxi,
  ferry, boat, airport, cargo, truck, school bus, parking, depot, garage, motor pool or stop.
- **Jeepney:** a name with jeep, jeepney, e-jeep or PUJ, or the tags `jeepney=yes`, `bus=jeep`,
  `amenity=jeepney_station` or `share_taxi=yes`.
- **UV Express:** a name with UV, U.V., UV Express, FX or "passenger van", or `minibus=yes`. A
  terminal named for both is listed as a jeepney terminal.
- **Duplicates:** a terminal mapped twice (a node and a way, same name within 150 m) is one row.
- **Area:** the nearest barangay in Para's landmark file, to group rows. It is not an address.

167 terminals: 121 jeepney, 46 UV Express.

| Area (nearest barangay) | Name | Kind | Lat, lng | OSM |
| --- | --- | --- | --- | --- |
| Alabang | Alabang Jeepney Terminal | Jeepney | 14.41751, 121.04408 | [r19103097](https://www.openstreetmap.org/relation/19103097) |
| Alabang | Alabang Town Center UV Express Terminal | UV Express | 14.42362, 121.03149 | [w445906547](https://www.openstreetmap.org/way/445906547) |
| Alabang | Festival Mall Jeepney Terminal | Jeepney | 14.41790, 121.04222 | [n5355720944](https://www.openstreetmap.org/node/5355720944) |
| Alabang | South Station Jeepney/Multicab Terminal | Jeepney | 14.41995, 121.04366 | [w791937370](https://www.openstreetmap.org/way/791937370) |
| Alabang | UV Express | UV Express | 14.41799, 121.04191 | [n5132486689](https://www.openstreetmap.org/node/5132486689) |
| Alabang | UV Express Terminal | UV Express | 14.42112, 121.04349 | [w791937372](https://www.openstreetmap.org/way/791937372) |
| Alangilan | Jeepney/UV Express Terminal | Jeepney | 13.78954, 121.06144 | [w776662537](https://www.openstreetmap.org/way/776662537) |
| Almanza Dos | North Springville Yellow Multicab Terminal | UV Express | 14.39213, 120.99507 | [w1340478604](https://www.openstreetmap.org/way/1340478604) |
| Almanza Uno | SM Transport Terminal | Jeepney | 14.43324, 121.01262 | [w632555192](https://www.openstreetmap.org/way/632555192) |
| Almanza Uno | Southmall to Molino Jeepney Station | Jeepney | 14.43521, 121.01083 | [n2562838812](https://www.openstreetmap.org/node/2562838812) |
| Apolonio Samson | Balintawak Cloverleaf Jeepney Station | Jeepney | 14.65632, 121.00472 | [w121783517](https://www.openstreetmap.org/way/121783517) |
| Aranan Creek | Centris UV Express FX Terminal | UV Express | 14.64414, 121.03891 | [w773124869](https://www.openstreetmap.org/way/773124869) |
| Bagong Pag-asa | Trinoma PUJ Terminal | Jeepney | 14.65451, 121.03359 | [w1573396831](https://www.openstreetmap.org/way/1573396831) |
| Bagumbayan | Bagumbayan Jeepney Terminal | Jeepney | 14.60634, 121.08206 | [n6006974256](https://www.openstreetmap.org/node/6006974256) |
| Balanga | Dagatan Jeepney Terminal | Jeepney | 13.73613, 121.19777 | [w465573493](https://www.openstreetmap.org/way/465573493) |
| Balibago | Jeepney Terminal: Hagonoy - BSU/Malolos Crossing | Jeepney | 14.83643, 120.73389 | [n4266677204](https://www.openstreetmap.org/node/4266677204) |
| Balibago | Jeepney Terminal: Hagonoy - Malolos Bayan | Jeepney | 14.83560, 120.73382 | [n4266675705](https://www.openstreetmap.org/node/4266675705) |
| Balibago | Jeepney Terminal: Hagonoy - Robinsons Malolos | Jeepney | 14.83674, 120.73416 | [n4266677301](https://www.openstreetmap.org/node/4266677301) |
| Baliwag | Bailen-Naic Jeepney Terminal | Jeepney | 14.18517, 120.79570 | [n10747621556](https://www.openstreetmap.org/node/10747621556) |
| Baliwag | Jeep to Naic | Jeepney | 14.18472, 120.79662 | [n4594110690](https://www.openstreetmap.org/node/4594110690) |
| Banga I | Jeepney Terminal | Jeepney | 14.88179, 120.86644 | [n4272500892](https://www.openstreetmap.org/node/4272500892) |
| Barangay 159 | PUC-Balintawak Jeepney Terminal | Jeepney | 14.68039, 121.00958 | [n4271992889](https://www.openstreetmap.org/node/4271992889) |
| Barangay 159 | PUC-Blumentritt Jeepney Terminal | Jeepney | 14.68047, 121.00951 | [n4271992789](https://www.openstreetmap.org/node/4271992789) |
| Barangay 172 | Vicas UV Terminal | UV Express | 14.74485, 121.03484 | [n4954893423](https://www.openstreetmap.org/node/4954893423) |
| Barangay 176-C | Tungko - Licao Licao Jeepney station | Jeepney | 14.78979, 121.07536 | [n4800807748](https://www.openstreetmap.org/node/4800807748) |
| Barangay 176-C | Tungko - San Jose Jeepney Station | Jeepney | 14.78908, 121.07523 | [n3189049330](https://www.openstreetmap.org/node/3189049330) |
| Barangay 176-C | Tungko to Muzon Terminal | Jeepney | 14.78938, 121.07383 | [n3604176376](https://www.openstreetmap.org/node/3604176376) |
| Barangay 176-D | Francisco Homes Jeepney Terminal | Jeepney | 14.80892, 121.05866 | [n4218561789](https://www.openstreetmap.org/node/4218561789) |
| Barangay 176-E | Muzon-Santa Maria Jeepney Terminal | Jeepney | 14.80290, 121.03288 | [n2091205724](https://www.openstreetmap.org/node/2091205724) |
| Barangay 176-E | Muzon-Tungko Jeepney Terminal | Jeepney | 14.80086, 121.03620 | [n6237417988](https://www.openstreetmap.org/node/6237417988) |
| Barangay 183 | Nichols Jeepney Terminal | Jeepney | 14.52403, 121.02463 | [w1112806221](https://www.openstreetmap.org/way/1112806221) |
| Barangay 190 | NAIA Domestic Jeepney Terminal | Jeepney | 14.52723, 120.99909 | [n705788722](https://www.openstreetmap.org/node/705788722) |
| Barangay 567 | Jeepney Nagtahan-Otis | Jeepney | 14.59963, 120.99982 | [n4412498189](https://www.openstreetmap.org/node/4412498189) |
| Barangay 567 | Jeepney Terminal to Robinson Otis | Jeepney | 14.59972, 120.99978 | [n4370236195](https://www.openstreetmap.org/node/4370236195) |
| Barangay 76 | Monumento–Polo Jeepney Terminal | Jeepney | 14.65770, 120.98293 | [w575861721](https://www.openstreetmap.org/way/575861721) |
| Barangay 78 | Monumento–Acacia–Malabon Jeepney Terminal | Jeepney | 14.65783, 120.98301 | [w1126600244](https://www.openstreetmap.org/way/1126600244) |
| Barangay 86 | Monumento - Malinta Exit Jeepney Terminal | Jeepney | 14.65655, 120.98514 | [n5271508223](https://www.openstreetmap.org/node/5271508223) |
| Barangay 86 | Monumento - Sta. Maria Jeepney Terminal | Jeepney | 14.65645, 120.98522 | [n7335365685](https://www.openstreetmap.org/node/7335365685) |
| Barangay 88 | Monumento - St. Francis and Malinta Jeepney Terminal | Jeepney | 14.65441, 120.98474 | [w708713979](https://www.openstreetmap.org/way/708713979) |
| Barangay 98 | Van Terminal Balayan | UV Express | 14.53878, 121.00149 | [n5047615023](https://www.openstreetmap.org/node/5047615023) |
| Barangay III | Santa Cruz-Siniloan Jeepney Terminal | Jeepney | 14.28302, 121.41555 | [w1022757244](https://www.openstreetmap.org/way/1022757244) |
| Batingan | Tanay Jeepney Terminal | Jeepney | 14.49340, 121.28872 | [n1586562258](https://www.openstreetmap.org/node/1586562258) |
| Bigaa | Alabang Jeepney Terminal | Jeepney | 14.31735, 121.10641 | [n5156798393](https://www.openstreetmap.org/node/5156798393) |
| Bigaa | SM Calamba - Expressway Jeepney | Jeepney | 14.29324, 121.10453 | [n5019918928](https://www.openstreetmap.org/node/5019918928) |
| Bigaa | Tagaytay Jeepney Terminal | Jeepney | 14.29240, 121.10377 | [n5019918624](https://www.openstreetmap.org/node/5019918624) |
| Burgos | Maly Jeepney Terminal | Jeepney | 14.71153, 121.13342 | [w878886505](https://www.openstreetmap.org/way/878886505) |
| Burgos | San Jose - Litex Jeepney Terminal | Jeepney | 14.72954, 121.14158 | [n5417648821](https://www.openstreetmap.org/node/5417648821) |
| C. Benitez Street | Cubao - Divisoria Jeepney Terminal | Jeepney | 14.62140, 121.04932 | [n4203732991](https://www.openstreetmap.org/node/4203732991) |
| C. Benitez Street | Farmers Market UV Express Station | UV Express | 14.61974, 121.05167 | [n965963133](https://www.openstreetmap.org/node/965963133) |
| Cabambangan | Bacolor Jeepney Terminal | Jeepney | 14.99841, 120.65313 | [w169972924](https://www.openstreetmap.org/way/169972924) |
| Canumay East | VGC Jeepney Terminal | Jeepney | 14.71076, 120.99309 | [w685161797](https://www.openstreetmap.org/way/685161797) |
| Commonwealth | Jeepney Terminal: Litex-Montalban | Jeepney | 14.70139, 121.08688 | [n2059301663](https://www.openstreetmap.org/node/2059301663) |
| Concepcion Uno | Tumana-Balara Jeepney Terminal | Jeepney | 14.65356, 121.10233 | [n4426827094](https://www.openstreetmap.org/node/4426827094) |
| Corazon | Jeepney Terminal: Calumpit - Meycauayan | Jeepney | 14.90764, 120.76762 | [n3130564173](https://www.openstreetmap.org/node/3130564173) |
| Cumba | Passenger Van Station | UV Express | 13.93780, 120.72925 | [n4120124693](https://www.openstreetmap.org/node/4120124693) |
| Deparo | Del Rosario Transportation UV Express Service | UV Express | 14.74161, 121.02454 | [n11835983185](https://www.openstreetmap.org/node/11835983185) |
| Deparo | U.V. Express Terminal - To SM Fairview | UV Express | 14.74181, 121.02197 | [n10861990363](https://www.openstreetmap.org/node/10861990363) |
| Deparo | UV Express Service | UV Express | 14.74084, 121.02426 | [n11377300272](https://www.openstreetmap.org/node/11377300272) |
| Dolores | Antipolo FX Transport Terminal | UV Express | 14.56602, 121.14122 | [n2402042492](https://www.openstreetmap.org/node/2402042492) |
| Doneza Street | Valenzuela Modernized Jeepney Terminal | Jeepney | 14.69474, 120.96941 | [w1125756263](https://www.openstreetmap.org/way/1125756263) |
| E. Rodriguez Avenue | Sampaloc-Tanay Jeep Terminal | Jeepney | 14.54599, 121.36427 | [n4844611523](https://www.openstreetmap.org/node/4844611523) |
| E. Rodriguez Sr. | Gateway Plaza UV Express Station | UV Express | 14.62257, 121.05265 | [n700738852](https://www.openstreetmap.org/node/700738852) |
| Estrella | Estrella Jeepney Terminal | Jeepney | 14.33494, 121.01931 | [n7401438034](https://www.openstreetmap.org/node/7401438034) |
| Guadalupe Nuevo | Guadalupe Jeepney Terminal | Jeepney | 14.56637, 121.04648 | [w224454270](https://www.openstreetmap.org/way/224454270) |
| Guadalupe Viejo | Guadalupe - Ayala Jeepney Terminal | Jeepney | 14.56553, 121.04441 | [n8712135119](https://www.openstreetmap.org/node/8712135119) |
| Guadalupe Viejo | Guadalupe - Delpan Jeepney Terminal | Jeepney | 14.56560, 121.04402 | [n8712136818](https://www.openstreetmap.org/node/8712136818) |
| Gulod Itaas | Dumantay Jeepney Terminal | Jeepney | 13.76553, 121.10575 | [w947590295](https://www.openstreetmap.org/way/947590295) |
| H. Santos Street | PRC-Mantrade/Kayamanan C Jeepney Terminal | Jeepney | 14.57395, 121.01614 | [n7557103001](https://www.openstreetmap.org/node/7557103001) |
| Highway Hills | Jeepney Terminal | Jeepney | 14.57999, 121.05481 | [n4535240896](https://www.openstreetmap.org/node/4535240896) |
| Highway Hills | Parklea Jeepney Terminal | Jeepney | 14.58148, 121.05264 | [w146336914](https://www.openstreetmap.org/way/146336914) |
| Highway Hills | PUJ Morong-Tanay | Jeepney | 14.58210, 121.05380 | [w317876514](https://www.openstreetmap.org/way/317876514) |
| Highway Hills | UV Express - Sta Rosa | UV Express | 14.58217, 121.05365 | [w317876515](https://www.openstreetmap.org/way/317876515) |
| Holy Spirit | Ever Jeepney Terminal | Jeepney | 14.67790, 121.08418 | [n3190133402](https://www.openstreetmap.org/node/3190133402) |
| I-A | Cavite Pala-Pala UV Express Terminal | UV Express | 14.07293, 121.31906 | [w381685267](https://www.openstreetmap.org/way/381685267) |
| Ilog | Lemery Jeepney Terminal | Jeepney | 13.88018, 120.91191 | [n7543011844](https://www.openstreetmap.org/node/7543011844) |
| Juliana | Jeepney Terminal | Jeepney | 15.03850, 120.67986 | [w754167270](https://www.openstreetmap.org/way/754167270) |
| Landayan | Pacita UV Express Terminal | UV Express | 14.34804, 121.06484 | [w821983552](https://www.openstreetmap.org/way/821983552) |
| Landayan | Pacita-Sucat Jeepney Terminal | Jeepney | 14.34840, 121.06394 | [w1154171426](https://www.openstreetmap.org/way/1154171426) |
| Langgam | Langgam Jeepney Terminal | Jeepney | 14.33032, 121.01914 | [n7401438039](https://www.openstreetmap.org/node/7401438039) |
| Lantic | Biñan - Loma Jeepney Terminal | Jeepney | 14.27970, 121.05524 | [n5139494384](https://www.openstreetmap.org/node/5139494384) |
| Layunan | UV Express Binangonan Terminal | UV Express | 14.46956, 121.19030 | [n6008802285](https://www.openstreetmap.org/node/6008802285) |
| M. L. Quezon Street | Ayala UV Express | UV Express | 14.58726, 121.17517 | [n4540506189](https://www.openstreetmap.org/node/4540506189) |
| M. L. Quezon Street | Jeepney Terminal | Jeepney | 14.58798, 121.17363 | [n1748335441](https://www.openstreetmap.org/node/1748335441) |
| M. L. Quezon Street | PUJ JRC | Jeepney | 14.58795, 121.17507 | [w235585543](https://www.openstreetmap.org/way/235585543) |
| M. L. Quezon Street | UV Express  terminal, Antipolo | UV Express | 14.58671, 121.17484 | [n8191463019](https://www.openstreetmap.org/node/8191463019) |
| M. L. Quezon Street | UV Express Ayala via Junction | UV Express | 14.58703, 121.17471 | [w318017344](https://www.openstreetmap.org/way/318017344) |
| M. L. Quezon Street | UV Express Cubao | UV Express | 14.58748, 121.17536 | [w317889856](https://www.openstreetmap.org/way/317889856) |
| M. L. Quezon Street | UV Express Megamall/Ayala | UV Express | 14.58738, 121.17516 | [w306695554](https://www.openstreetmap.org/way/306695554) |
| Maaasahan Street | Jeepney Terminal | Jeepney | 14.50623, 121.04199 | [n13610806875](https://www.openstreetmap.org/node/13610806875) |
| Maduya | Olivarez/Central Mall Jeepney Terminal | Jeepney | 14.33301, 121.08209 | [w1119486609](https://www.openstreetmap.org/way/1119486609) |
| Maitim II East | Tagaytay Jeepney Terminal | Jeepney | 14.12748, 120.97995 | [n5060435726](https://www.openstreetmap.org/node/5060435726) |
| Malalim | Lobo Jeepney Terminal | Jeepney | 13.64852, 121.21195 | [w792347039](https://www.openstreetmap.org/way/792347039) |
| Malanday | Jeepney Terminal | Jeepney | 14.71712, 120.95649 | [w288161826](https://www.openstreetmap.org/way/288161826) |
| Malinta | KARTUJODA Jeepney Terminal | Jeepney | 14.69004, 120.97632 | [w1518525959](https://www.openstreetmap.org/way/1518525959) |
| Mambog | Molino UV Express Terminal | UV Express | 14.40575, 120.97769 | [n2855102672](https://www.openstreetmap.org/node/2855102672) |
| Marcos Highway | Jeepneys to Maysawa, Sampaloc and Tanay | Jeepney | 14.61782, 121.16973 | [n5458336121](https://www.openstreetmap.org/node/5458336121) |
| Mariano Espeleta I | UV Express Terminal | UV Express | 14.39575, 120.96856 | [n3602062697](https://www.openstreetmap.org/node/3602062697) |
| Mayamot | UV Express to Ayala and Megamall | UV Express | 14.62561, 121.12337 | [n7738463593](https://www.openstreetmap.org/node/7738463593) |
| Mayapa | Palo-Alto Jeepney Terminal | Jeepney | 14.20891, 121.12352 | [n2127709631](https://www.openstreetmap.org/node/2127709631) |
| Ninety Sixth | Malabon Jeepney Terminal | Jeepney | 14.38169, 120.87880 | [w1376014882](https://www.openstreetmap.org/way/1376014882) |
| North Daang Hari | Bicutan Jeepney Terminal | Jeepney | 14.48813, 121.04837 | [n6366495476](https://www.openstreetmap.org/node/6366495476) |
| Novaliches Proper | Novaliches–Deparo Jeepney Terminal | Jeepney | 14.72323, 121.03882 | [w1513745897](https://www.openstreetmap.org/way/1513745897) |
| Padre Burgos Street | UP-Katipunan PUJ Terminal | Jeepney | 14.63296, 121.07425 | [n13166806413](https://www.openstreetmap.org/node/13166806413) |
| Pag-asa | Kalentong Jeepney Terminal | Jeepney | 14.58940, 121.02273 | [n4709300830](https://www.openstreetmap.org/node/4709300830) |
| Pallocan-Libjo Creek | Pallocan Jeepney Terminal | Jeepney | 13.75586, 121.07112 | [w792347046](https://www.openstreetmap.org/way/792347046) |
| Pansol | Tumana-Balara Jeepney Terminal | Jeepney | 14.65347, 121.07507 | [n4428508791](https://www.openstreetmap.org/node/4428508791) |
| Pasong Putik Proper | UV Express Terminal | UV Express | 14.73513, 121.05673 | [n5140538792](https://www.openstreetmap.org/node/5140538792) |
| Pinagkaisahan | EDSA-Jupiter Jeepney Terminal | Jeepney | 14.55584, 121.03522 | [w700619564](https://www.openstreetmap.org/way/700619564) |
| Pinagsama | Ayala - McKinley Stadium UV Station | UV Express | 14.53041, 121.05324 | [n5793089300](https://www.openstreetmap.org/node/5793089300) |
| Pinamucan | Ilijan Jeepney Terminal | Jeepney | 13.63359, 121.07029 | [w796765925](https://www.openstreetmap.org/way/796765925) |
| Poblacion | HBC San Pedro Jeepney Terminal | Jeepney | 14.36175, 121.05648 | [w791710674](https://www.openstreetmap.org/way/791710674) |
| Poblacion | Ibaan-Lipa UV Express Terminal | UV Express | 13.81798, 121.13304 | [w734399468](https://www.openstreetmap.org/way/734399468) |
| Poblacion | Jeepney Terminal to Malolos | Jeepney | 14.88693, 120.86440 | [n3129080860](https://www.openstreetmap.org/node/3129080860) |
| Poblacion | SPBSBJODAI Jeepney Terminal | Jeepney | 14.36152, 121.05736 | [n4514139354](https://www.openstreetmap.org/node/4514139354) |
| Poblacion Barangay 1 | Uptown UV Express Terminal | UV Express | 13.94265, 121.15346 | [w901823403](https://www.openstreetmap.org/way/901823403) |
| Rosario | UV Exp - Market Market | UV Express | 14.58984, 121.09714 | [n3914069658](https://www.openstreetmap.org/node/3914069658) |
| Sabang | Malabanan Jeepney Terminal | Jeepney | 13.97053, 121.16571 | [n4082512105](https://www.openstreetmap.org/node/4082512105) |
| Sagad | UV Expresss Terminal | UV Express | 14.56016, 121.08064 | [n2043116606](https://www.openstreetmap.org/node/2043116606) |
| Sambong | Jeepney Terminal | Jeepney | 14.05184, 120.93322 | [n9941691481](https://www.openstreetmap.org/node/9941691481) |
| San Agustin 1 | DVDOTSC Pala-Pala Modern Jeepney Terminal | Jeepney | 14.30174, 120.95391 | [n5580317585](https://www.openstreetmap.org/node/5580317585) |
| San Agustin 1 | PERJODA Pala-pala Modern Jeepney Terminal | Jeepney | 14.30160, 120.95394 | [n13921530724](https://www.openstreetmap.org/node/13921530724) |
| San Antonio | Floridablanca Terminal | Jeepney | 14.97067, 120.60377 | [n2521902909](https://www.openstreetmap.org/node/2521902909) |
| San Antonio | SM City Pampanga- Golangco Terminal | Jeepney | 14.97014, 120.60547 | [n2521919787](https://www.openstreetmap.org/node/2521919787) |
| San Antonio | UV Express (Pasig-Quiapo) | UV Express | 14.57705, 121.05881 | [n3969690833](https://www.openstreetmap.org/node/3969690833) |
| San Cristobal | Jeepney Station (bound for San Pablo City) | Jeepney | 14.01619, 121.40101 | [n4760968124](https://www.openstreetmap.org/node/4760968124) |
| San Cristobal | Jeepney Station (bound for Tiaong, Quezon) | Jeepney | 14.01610, 121.40106 | [n4760964536](https://www.openstreetmap.org/node/4760964536) |
| San Diego | Nasugbu Van Terminal | UV Express | 14.07178, 120.63218 | [w865536447](https://www.openstreetmap.org/way/865536447) |
| San Isidro | Balagbag Jeepney Terminal | Jeepney | 13.98052, 121.30095 | [n3125878047](https://www.openstreetmap.org/node/3125878047) |
| San Isidro River | San Isidro (Ayala) Jeepney Terminal | Jeepney | 13.73267, 121.07675 | [w796765920](https://www.openstreetmap.org/way/796765920) |
| San Jose | Bulakan - Balagtas Jeepney Terminal | Jeepney | 14.79525, 120.87700 | [w1337982468](https://www.openstreetmap.org/way/1337982468) |
| San Jose | Jeepney Terminal (Balagtas and Malolos City) | Jeepney | 14.79517, 120.87801 | [w123747898](https://www.openstreetmap.org/way/123747898) |
| San Juan | PUJ Cubao | Jeepney | 14.56390, 121.13271 | [n3879597118](https://www.openstreetmap.org/node/3879597118) |
| San Juan I | Naic Jeepney Terminal | Jeepney | 14.32186, 120.77060 | [n8528036518](https://www.openstreetmap.org/node/8528036518) |
| San Lorenzo | UV Express South Bound | UV Express | 14.54915, 121.02553 | [n3267463745](https://www.openstreetmap.org/node/3267463745) |
| San Lorenzo | UV Express Terminal | UV Express | 14.54937, 121.02555 | [n6227553885](https://www.openstreetmap.org/node/6227553885) |
| San Martin de Porres | Jeepney Terminal | Jeepney | 14.49322, 121.04067 | [n13685887035](https://www.openstreetmap.org/node/13685887035) |
| San Martin de Porres | Jeepney Terminal | Jeepney | 14.48603, 121.04112 | [n4691938889](https://www.openstreetmap.org/node/4691938889) |
| San Martin de Porres | SM Bicutan UV & Jeepney Terminal | Jeepney | 14.48817, 121.04367 | [w1149354831](https://www.openstreetmap.org/way/1149354831) |
| San Martin de Porres | UV Express | UV Express | 14.48830, 121.04394 | [n3769923291](https://www.openstreetmap.org/node/3769923291) |
| Santa Clara | Batangas Port Jeepney Terminal | Jeepney | 13.75269, 121.04402 | [n721035147](https://www.openstreetmap.org/node/721035147) |
| Santa Clara | Jeep Terminal | Jeepney | 14.82284, 120.95368 | [w348076596](https://www.openstreetmap.org/way/348076596) |
| Santa Clara | Pier Jeepney Terminal | Jeepney | 13.75270, 121.04415 | [w823671417](https://www.openstreetmap.org/way/823671417) |
| Santa Cruz | Tabang UV Express Terminal | UV Express | 14.83838, 120.86268 | [w607861614](https://www.openstreetmap.org/way/607861614) |
| Santa Lucia | Santa Lucia Jeepney Terminal | Jeepney | 14.70585, 121.05278 | [w797201826](https://www.openstreetmap.org/way/797201826) |
| Santiago | LIMA UV Express Terminal | UV Express | 14.00826, 121.16648 | [w798608254](https://www.openstreetmap.org/way/798608254) |
| Santo Cristo | Jeepney Terminal | Jeepney | 14.96399, 120.62976 | [w149140371](https://www.openstreetmap.org/way/149140371) |
| Santo Cristo | Pulilan Jeepney Terminal | Jeepney | 14.90071, 120.86759 | [w307812080](https://www.openstreetmap.org/way/307812080) |
| Santo Niño | Cubao/Recto Transport Fx Terminal | UV Express | 14.85264, 120.81641 | [w300448306](https://www.openstreetmap.org/way/300448306) |
| Santo Niño | Jeepney Terminal to Paombong/ Hagonoy | Jeepney | 14.84352, 120.81090 | [w300720902](https://www.openstreetmap.org/way/300720902) |
| Santo Niño | Jeepney Terminal: Malolos - Paombong | Jeepney | 14.84344, 120.81066 | [n4279241190](https://www.openstreetmap.org/node/4279241190) |
| Santo Niño | SPTC Jeepney Terminal | Jeepney | 14.36771, 121.05092 | [n6575020692](https://www.openstreetmap.org/node/6575020692) |
| Santo Niño | UV to DAU | UV Express | 14.85670, 120.80987 | [n6816792285](https://www.openstreetmap.org/node/6816792285) |
| Santo Rosario | Sn. Fdo-Bulaon Jeep Terminal | Jeepney | 15.03005, 120.69207 | [n1316212550](https://www.openstreetmap.org/node/1316212550) |
| Santo Rosario–Silangan | Napindan Jeepney Terminal | Jeepney | 14.55315, 121.07278 | [n1319917493](https://www.openstreetmap.org/node/1319917493) |
| Sapang Palay Proper | Jeepney Terminal | Jeepney | 14.81523, 121.04292 | [n339127871](https://www.openstreetmap.org/node/339127871) |
| Socorro | Araneta City Jeepney Terminal | Jeepney | 14.61779, 121.05449 | [w900276075](https://www.openstreetmap.org/way/900276075) |
| Talon Kuatro | Cavite Jeepney Station | Jeepney | 14.43656, 121.00587 | [n1808544697](https://www.openstreetmap.org/node/1808544697) |
| Tandang Sora | Tandang Sora - Quezon City Hall Jeepney Terminal | Jeepney | 14.67458, 121.04337 | [n1260852424](https://www.openstreetmap.org/node/1260852424) |
| Tanguile Street | FX to SM Megamall | UV Express | 14.54922, 121.06319 | [n4272882691](https://www.openstreetmap.org/node/4272882691) |
| Tanzang Luma II | Imus via Alabang UV Express Terminal | UV Express | 14.42260, 120.94249 | [w1198626932](https://www.openstreetmap.org/way/1198626932) |
| Tejeros | PRC-Libertad Jeepney Terminal | Jeepney | 14.57071, 121.01539 | [n7557103004](https://www.openstreetmap.org/node/7557103004) |
| Tunasan | UV Express Terminal - Victoria RV1 to Alabang | UV Express | 14.36486, 121.01278 | [n12762035168](https://www.openstreetmap.org/node/12762035168) |
| Turo | UV Dau/Angeles Pampanga station | UV Express | 14.80747, 120.94138 | [n1425035225](https://www.openstreetmap.org/node/1425035225) |
| VII-B | Jeepney Station (bound for Tanauan, Batangas) | Jeepney | 14.06989, 121.32359 | [n4760967831](https://www.openstreetmap.org/node/4760967831) |
| VII-C | Jeepney Station (bound for SM City San Pablo) | Jeepney | 14.06935, 121.32452 | [n4760967832](https://www.openstreetmap.org/node/4760967832) |
| VII-E | Jeepney Station (bound for Dolores, Quezon) | Jeepney | 14.06746, 121.32411 | [n4760961343](https://www.openstreetmap.org/node/4760961343) |
| Wawa | UV Express | UV Express | 14.81981, 120.90447 | [n5731987994](https://www.openstreetmap.org/node/5731987994) |
