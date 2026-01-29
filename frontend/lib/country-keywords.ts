/**
 * Country-Specific Local Language Keywords
 *
 * This file contains native language keywords for each country,
 * organized by security, political, and economic categories.
 *
 * Keywords are sourced from:
 * - Eagle Journalist agents.yaml configurations
 * - Native language research for each country
 * - International organization names in local languages
 */

export interface CountryKeywords {
  security: string;
  political: string;
  economic: string;
}

/**
 * Complete mapping of countries to their local language keywords
 * Each country has security, political, and economic keyword strings
 */
export const COUNTRY_KEYWORDS: Record<string, CountryKeywords> = {
  // ============================================================================
  // EASTERN EUROPE
  // ============================================================================

  // POLAND - Polish
  poland: {
    security: "NATO,wojsko,obrona,armia,wojna,konflikt,atak,bezpieczeństwo,granica,żołnierz,Ukraina,Rosja,Putin,Zełenski,dron,missile,broń,Tarcza Wschód,F-35",
    political: "rząd,Sejm,Senat,polityka,Sikorski,Tusk,Duda,prezydent,premier,wybory,koalicja,opozycja,minister,ustawa,parlament,PiS,PO,Konfederacja",
    economic: "gospodarka,budżet,PKB,inflacja,NBP,euro,złoty,eksport,import,inwestycje,handel,sankcje,cło,energia,Orlen",
  },

  // UKRAINE - Ukrainian
  ukraine: {
    security: "війна,фронт,обстріл,ЗСУ,Донбас,дрон,ракета,invasion,military,troops,Zelensky,Зеленський,оборона,атака,HIMARS,ППО,F-16,Курськ,Харків,Крим",
    political: "Рада,уряд,президент,Зеленський,дипломатія,переговори,summit,NATO,EU,Верховна,закон,коаліція,Єрмак,Кулеба",
    economic: "економіка,гривня,інфляція,бюджет,санкції,допомога,reconstruction,IMF,trade,енергетика,експорт,Нафтогаз",
  },

  // RUSSIA - Russian
  russia: {
    security: "военный,армия,войска,ракета,война,конфликт,Putin,Путин,ядерный,ПВО,дрон,НАТО,граница,Украина,Министерство обороны,Шойгу,Герасимов",
    political: "Кремль,правительство,Дума,закон,президент,министр,дипломатия,санкции,выборы,Единая Россия,оппозиция,Мишустин",
    economic: "экономика,рубль,инфляция,санкции,энергетика,нефть,газ,экспорт,бюджет,ЦБ,Газпром,Роснефть",
  },

  // ESTONIA - Estonian
  estonia: {
    security: "sõjavägi,kaitse,NATO,julgeoleku,piir,Venemaa,droon,rünnak,kaitsevägi,Kaliningrad,Narva,küberrünnak",
    political: "valitsus,Riigikogu,president,minister,seadus,koalitsioon,välispoliitika,diplomaatia,Kallas,Karis",
    economic: "majandus,inflatsioon,euro,eelarve,eksport,import,investeering,kaubandus,energia",
  },

  // LATVIA - Latvian
  latvia: {
    security: "armija,aizsardzība,NATO,drošība,robeža,Krievija,drons,uzbrukums,militārs,Kaliningrad,kibernoziegumi",
    political: "valdība,Saeima,prezidents,ministrs,likums,koalīcija,ārpolitika,diplomātija,Kariņš,Levits",
    economic: "ekonomika,inflācija,eiro,budžets,eksports,imports,investīcijas,tirdzniecība,enerģija",
  },

  // LITHUANIA - Lithuanian
  lithuania: {
    security: "kariuomenė,gynyba,NATO,saugumas,siena,Rusija,dronas,ataka,karinis,Kaliningrad,Belarus,kibernetinis",
    political: "vyriausybė,Seimas,prezidentas,ministras,įstatymas,koalicija,užsienio,diplomatija,Šimonytė,Nausėda",
    economic: "ekonomika,infliacija,euras,biudžetas,eksportas,importas,investicijos,prekyba,energetika",
  },

  // CZECH REPUBLIC - Czech
  czech: {
    security: "armáda,obrana,NATO,bezpečnost,hranice,Rusko,útok,vojsko,letectvo,munice,Ukrajina",
    political: "vláda,parlament,prezident,ministr,zákon,koalice,opozice,volby,Fiala,Pavel,ANO,ODS",
    economic: "ekonomika,inflace,koruna,rozpočet,export,import,investice,obchod,energie,ČNB",
  },

  // HUNGARY - Hungarian
  hungary: {
    security: "hadsereg,védelem,NATO,biztonság,határ,Oroszország,támadás,katonai,Ukrajna,drón",
    political: "kormány,parlament,miniszterelnök,miniszter,törvény,koalíció,ellenzék,választás,Orbán,Fidesz,Magyar",
    economic: "gazdaság,infláció,forint,költségvetés,export,import,befektetés,kereskedelem,energia,MNB",
  },

  // ROMANIA - Romanian
  romania: {
    security: "armată,apărare,NATO,securitate,graniță,Rusia,atac,militar,Ucraina,dronă,Marea Neagră",
    political: "guvern,parlament,președinte,ministru,lege,coaliție,opoziție,alegeri,Iohannis,PSD,PNL",
    economic: "economie,inflație,leu,buget,export,import,investiții,comerț,energie,BNR",
  },

  // BULGARIA - Bulgarian
  bulgaria: {
    security: "армия,отбрана,НАТО,сигурност,граница,Русия,атака,военен,Украйна,дрон,Черно море",
    political: "правителство,парламент,президент,министър,закон,коалиция,опозиция,избори,Радев,ГЕРБ,ПП",
    economic: "икономика,инфлация,лев,бюджет,износ,внос,инвестиции,търговия,енергия,БНБ",
  },

  // SLOVAKIA - Slovak
  slovakia: {
    security: "armáda,obrana,NATO,bezpečnosť,hranica,Rusko,útok,vojenský,Ukrajina,drón",
    political: "vláda,parlament,prezident,minister,zákon,koalícia,opozícia,voľby,Fico,Pellegrini,Smer",
    economic: "ekonomika,inflácia,euro,rozpočet,export,import,investície,obchod,energia,NBS",
  },

  // MOLDOVA - Romanian/Moldovan
  moldova: {
    security: "armată,apărare,NATO,securitate,graniță,Rusia,Transnistria,atac,militar,Ucraina",
    political: "guvern,parlament,președinte,ministru,lege,alegeri,Sandu,PAS,opoziție,integrare europeană",
    economic: "economie,inflație,leu,buget,export,import,investiții,energie,gaz,Gazprom",
  },

  // BELARUS - Belarusian/Russian
  belarus: {
    security: "армия,абарона,НАТО,бяспека,мяжа,Расія,атака,ваенны,Украіна,Лукашенко,войска",
    political: "урад,парламент,прэзідэнт,міністр,закон,выбары,Лукашэнка,апазіцыя,санкцыі,Ціханоўская",
    economic: "эканоміка,інфляцыя,рубель,бюджэт,экспарт,імпарт,санкцыі,энергетыка,Белнафта",
  },

  // GEORGIA - Georgian
  georgia: {
    security: "სამხედრო,თავდაცვა,NATO,უსაფრთხოება,საზღვარი,რუსეთი,აფხაზეთი,სამხრეთ ოსეთი,თავდასხმა",
    political: "მთავრობა,პარლამენტი,პრეზიდენტი,მინისტრი,კანონი,არჩევნები,ქართული ოცნება,ოპოზიცია,ევროკავშირი",
    economic: "ეკონომიკა,ინფლაცია,ლარი,ბიუჯეტი,ექსპორტი,იმპორტი,ინვესტიცია,ენერგეტიკა",
  },

  // SERBIA - Serbian
  serbia: {
    security: "војска,одбрана,НАТО,безбедност,граница,Русија,Косово,напад,војни,ЕУ",
    political: "влада,скупштина,председник,министар,закон,избори,Вучић,СНС,опозиција,Косово",
    economic: "економија,инфлација,динар,буџет,извоз,увоз,инвестиције,трговина,енергија,НБС",
  },

  // CROATIA - Croatian
  croatia: {
    security: "vojska,obrana,NATO,sigurnost,granica,vojni,napad,EU,oružje",
    political: "vlada,sabor,predsjednik,ministar,zakon,izbori,HDZ,SDP,oporba,Plenković,Milanović",
    economic: "ekonomija,inflacija,euro,proračun,izvoz,uvoz,investicije,turizam,energija,HNB",
  },

  // SLOVENIA - Slovenian
  slovenia: {
    security: "vojska,obramba,NATO,varnost,meja,vojaški,napad,EU",
    political: "vlada,parlament,predsednik,minister,zakon,volitve,Golob,SDS,opozicija",
    economic: "gospodarstvo,inflacija,evro,proračun,izvoz,uvoz,investicije,turizem,energija",
  },

  // BOSNIA - Bosnian/Croatian/Serbian
  bosnia: {
    security: "vojska,odbrana,NATO,sigurnost,granica,vojni,napad,EUFOR,Republika Srpska",
    political: "vlada,parlament,predsjedništvo,ministar,zakon,izbori,Dodik,Schmidt,OHR,RS,FBiH",
    economic: "ekonomija,inflacija,KM,budžet,izvoz,uvoz,investicije,energija",
  },

  // KOSOVO - Albanian
  kosovo: {
    security: "FSK,ushtria,NATO,KFOR,siguria,kufiri,Serbi,sulm,ushtarak",
    political: "qeveria,kuvendi,presidenti,ministri,ligji,zgjedhjet,Kurti,VV,opozita,dialog,Beograd",
    economic: "ekonomia,inflacioni,euro,buxheti,eksporti,importi,investimet,energjia",
  },

  // ALBANIA - Albanian
  albania: {
    security: "ushtria,mbrojtja,NATO,siguria,kufiri,sulm,ushtarak,Ballkani",
    political: "qeveria,kuvendi,presidenti,kryeministri,ligji,zgjedhjet,Rama,PS,PD,opozita",
    economic: "ekonomia,inflacioni,lek,buxheti,eksporti,importi,investimet,turizmi,energjia",
  },

  // MONTENEGRO - Montenegrin
  montenegro: {
    security: "vojska,odbrana,NATO,sigurnost,granica,vojni,napad",
    political: "vlada,skupština,predsjednik,premijer,zakon,izbori,DPS,opozicija,EU",
    economic: "ekonomija,inflacija,euro,budžet,izvoz,uvoz,investicije,turizam,energija",
  },

  // NORTH MACEDONIA - Macedonian
  north_macedonia: {
    security: "армија,одбрана,НАТО,безбедност,граница,воен,напад",
    political: "влада,собрание,претседател,министер,закон,избори,ВМРО-ДПМНЕ,СДСМ,опозиција,ЕУ",
    economic: "економија,инфлација,денар,буџет,извоз,увоз,инвестиции,енергија",
  },

  // ============================================================================
  // WESTERN EUROPE
  // ============================================================================

  // GERMANY - German
  germany: {
    security: "Bundeswehr,Verteidigung,NATO,Sicherheit,Grenze,Russland,Ukraine,Angriff,militär,Waffen,Zeitenwende,Leopard,Taurus",
    political: "Bundestag,Regierung,Koalition,Wahlen,Politik,Merz,Scholz,CDU,SPD,Grüne,AfD,FDP,Außenpolitik,Gesetz,Ampel",
    economic: "Wirtschaft,Inflation,Euro,Haushalt,Export,Import,Investition,Handel,Energie,BIP,EZB,Rezession",
  },

  // FRANCE - French
  france: {
    security: "armée,défense,OTAN,sécurité,frontière,Russie,Ukraine,attaque,militaire,armes,nucléaire",
    political: "Assemblée,gouvernement,coalition,élection,Macron,Marine Le Pen,RN,Renaissance,LFI,politique,loi,Sénat,Élysée,Barnier",
    economic: "économie,inflation,euro,budget,exportation,importation,investissement,commerce,énergie,PIB,BCE",
  },

  // UK - English
  uk: {
    security: "military,defence,NATO,security,border,troops,attack,weapons,Ukraine,Russia,army,navy,RAF,nuclear,Trident",
    political: "Parliament,Westminster,government,coalition,election,Starmer,Sunak,Labour,Conservative,Tory,Brexit,legislation,Scotland,Wales,Northern Ireland",
    economic: "economy,inflation,pound,sterling,budget,export,import,investment,trade,energy,GDP,Bank of England,recession",
  },

  // SPAIN - Spanish
  spain: {
    security: "ejército,defensa,OTAN,seguridad,frontera,ataque,militar,armas,terrorismo,ETA",
    political: "Congreso,gobierno,coalición,elecciones,Sánchez,PP,PSOE,VOX,Cataluña,independencia,ley",
    economic: "economía,inflación,euro,presupuesto,exportación,importación,inversión,comercio,energía,PIB,BCE",
  },

  // ITALY - Italian
  italy: {
    security: "esercito,difesa,NATO,sicurezza,confine,attacco,militare,armi,terrorismo",
    political: "Parlamento,governo,coalizione,elezioni,Meloni,FdI,PD,Lega,M5S,legge,Quirinale",
    economic: "economia,inflazione,euro,bilancio,esportazione,importazione,investimento,commercio,energia,PIL,BCE,debito",
  },

  // NETHERLANDS - Dutch
  netherlands: {
    security: "leger,defensie,NAVO,veiligheid,grens,aanval,militair,wapens,Rusland,Oekraïne",
    political: "Tweede Kamer,regering,coalitie,verkiezingen,Wilders,PVV,VVD,NSC,wet,formatie",
    economic: "economie,inflatie,euro,begroting,export,import,investering,handel,energie,BBP,ECB",
  },

  // BELGIUM - Dutch/French
  belgium: {
    security: "leger,défense,NAVO,OTAN,veiligheid,sécurité,grens,frontière,aanval,attaque,NATO,EU,Brussel",
    political: "parlement,gouvernement,regering,coalitie,coalition,verkiezingen,élections,federaal,fédéral,Vlaanderen,Wallonie",
    economic: "economie,économie,inflatie,inflation,euro,budget,begroting,export,import,investering,investissement",
  },

  // AUSTRIA - German
  austria: {
    security: "Bundesheer,Verteidigung,Sicherheit,Grenze,Russland,Neutralität,Angriff,militär",
    political: "Nationalrat,Regierung,Koalition,Wahlen,ÖVP,SPÖ,FPÖ,Grüne,NEOS,Bundeskanzler,Bundespräsident",
    economic: "Wirtschaft,Inflation,Euro,Budget,Export,Import,Investition,Handel,Energie,BIP,OeNB",
  },

  // SWITZERLAND - German/French/Italian
  switzerland: {
    security: "Armee,défense,Sicherheit,sécurité,Neutralität,neutralité,Grenze,frontière",
    political: "Bundesrat,Conseil fédéral,Parlament,Wahlen,élections,SVP,UDC,SP,PS,FDP,PLR,Referendum",
    economic: "Wirtschaft,économie,Inflation,Franken,franc,Budget,Export,Import,Investition,Handel,commerce,SNB,BNS",
  },

  // PORTUGAL - Portuguese
  portugal: {
    security: "exército,defesa,NATO,segurança,fronteira,ataque,militar,armas",
    political: "Assembleia,governo,coligação,eleições,PSD,PS,Chega,lei,parlamento,Presidente",
    economic: "economia,inflação,euro,orçamento,exportação,importação,investimento,comércio,energia,PIB,BCE",
  },

  // GREECE - Greek
  greece: {
    security: "στρατός,άμυνα,NATO,ασφάλεια,σύνορα,Τουρκία,επίθεση,στρατιωτικός,Αιγαίο,Κύπρος",
    political: "Βουλή,κυβέρνηση,συνασπισμός,εκλογές,ΝΔ,ΣΥΡΙΖΑ,ΠΑΣΟΚ,νόμος,Μητσοτάκης",
    economic: "οικονομία,πληθωρισμός,ευρώ,προϋπολογισμός,εξαγωγές,εισαγωγές,επενδύσεις,εμπόριο,ενέργεια,ΑΕΠ,ΕΚΤ",
  },

  // IRELAND - English/Irish
  ireland: {
    security: "army,defence,neutrality,security,border,Northern Ireland,terrorism,IRA",
    political: "Dáil,government,coalition,election,Fianna Fáil,Fine Gael,Sinn Féin,Taoiseach,legislation,reunification",
    economic: "economy,inflation,euro,budget,export,import,investment,trade,FDI,multinational,tax,GDP,ECB",
  },

  // NORWAY - Norwegian
  norway: {
    security: "forsvar,NATO,sikkerhet,grense,Russland,angrep,militær,Nordområdene,Svalbard,F-35",
    political: "Storting,regjering,koalisjon,valg,Arbeiderpartiet,Høyre,FrP,lov,Statsminister",
    economic: "økonomi,inflasjon,krone,budsjett,eksport,import,investering,handel,olje,gass,Oljefondet,Norges Bank",
  },

  // SWEDEN - Swedish
  sweden: {
    security: "försvar,NATO,säkerhet,gräns,Ryssland,attack,militär,ubåt,Gotland,JAS Gripen",
    political: "riksdag,regering,koalition,val,Socialdemokraterna,Moderaterna,SD,lag,Statsminister,Kristersson",
    economic: "ekonomi,inflation,krona,budget,export,import,investering,handel,energi,BNP,Riksbanken",
  },

  // FINLAND - Finnish
  finland: {
    security: "puolustusvoimat,NATO,turvallisuus,raja,Venäjä,hyökkäys,sotilaallinen,itäraja,F-35,Hornet",
    political: "eduskunta,hallitus,koalitio,vaalit,SDP,Kokoomus,Perussuomalaiset,laki,pääministeri,Orpo,Stubb",
    economic: "talous,inflaatio,euro,budjetti,vienti,tuonti,investointi,kauppa,energia,BKT,Suomen Pankki",
  },

  // DENMARK - Danish
  denmark: {
    security: "forsvar,NATO,sikkerhed,grænse,Rusland,angreb,militær,Grønland,Arktis,F-35",
    political: "Folketing,regering,koalition,valg,Socialdemokratiet,Venstre,DF,lov,Statsminister,Frederiksen",
    economic: "økonomi,inflation,krone,budget,eksport,import,investering,handel,energi,BNP,Nationalbanken",
  },

  // ICELAND - Icelandic
  iceland: {
    security: "varnarmál,NATO,öryggi,landhelgi,Rússland,hernaður,Keflavík",
    political: "Alþingi,ríkisstjórn,kosningar,Sjálfstæðisflokkur,Framsóknarflokkur,lög,forsætisráðherra",
    economic: "efnahagur,verðbólga,króna,fjárlög,útflutningur,innflutningur,fjárfesting,viðskipti,orka,Seðlabanki",
  },

  // ============================================================================
  // MIDDLE EAST
  // ============================================================================

  // ISRAEL - Hebrew
  israel: {
    security: "צבא,הגנה,ביטחון,גבול,התקפה,מלחמה,חמאס,חיזבאללה,עזה,גדה,IDF,iron dome,missile,drone,Iran,Lebanon,צה״ל,כיפת ברזל",
    political: "כנסת,ממשלה,נתניהו,בחירות,קואליציה,אופוזיציה,משפט,חוק,Supreme Court,Netanyahu,coalition,ליכוד,מפלגה",
    economic: "כלכלה,שקל,אינפלציה,תקציב,יצוא,יבוא,השקעות,סחר,אנרגיה,Bank of Israel,טכנולוגיה,הייטק",
  },

  // IRAN - Persian/Farsi
  iran: {
    security: "سپاه,نظامی,هسته‌ای,موشک,حمله,دفاع,IRGC,nuclear,missile,sanctions,Hezbollah,proxy,پهپاد,uranium",
    political: "دولت,مجلس,رهبر,خامنه‌ای,رئیسی,پزشکیان,وزیر خارجه,انتخابات,diplomacy,supreme leader,اصلاح‌طلب,اصولگرا",
    economic: "اقتصاد,ریال,تورم,تحریم,نفت,گاز,sanctions,oil,inflation,currency,JCPOA,برجام",
  },

  // IRAQ - Arabic
  iraq: {
    security: "جيش,أمن,حدود,داعش,ميليشيا,هجوم,عسكري,ISIS,militia,PMF,الحشد الشعبي,كردستان,attack",
    political: "حكومة,برلمان,رئيس,وزير,قانون,انتخابات,السوداني,الصدر,كردستان,شيعة,سنة",
    economic: "اقتصاد,نفط,دينار,ميزانية,صادرات,واردات,استثمار,OPEC,oil,corruption",
  },

  // TURKEY - Turkish
  turkey: {
    security: "ordu,savunma,NATO,güvenlik,sınır,saldırı,askeri,Suriye,Kürt,PKK,YPG,TSK,drone,Bayraktar,S-400",
    political: "hükümet,meclis,cumhurbaşkanı,başbakan,yasa,seçim,Erdoğan,AKP,CHP,muhalefet,anayasa",
    economic: "ekonomi,enflasyon,lira,bütçe,ihracat,ithalat,yatırım,ticaret,enerji,TCMB,faiz",
  },

  // SAUDI ARABIA - Arabic
  saudi_arabia: {
    security: "أمن,عسكري,حدود,إيران,اليمن,هجوم,دفاع,OPEC,oil,Iran,Yemen,Houthi,defense,الحوثي,التحالف",
    political: "حكومة,ولي العهد,محمد بن سلمان,MBS,Vision 2030,سياسة,دبلوماسية,summit,مجلس الشورى",
    economic: "اقتصاد,نفط,غاز,OPEC,استثمار,تجارة,ميزانية,ريال,PIF,Aramco,diversification,NEOM,رؤية 2030",
  },

  // UAE - Arabic
  uae: {
    security: "أمن,عسكري,حدود,إيران,defense,security,military,Iran,Houthi,Gulf,الإمارات",
    political: "حكومة,إمارات,دبلوماسية,summit,foreign minister,bilateral,Abraham Accords,محمد بن زايد,MBZ",
    economic: "اقتصاد,نفط,غاز,استثمار,تجارة,ADNOC,Dubai,Abu Dhabi,tourism,finance,درهم,الإمارات",
  },

  // QATAR - Arabic
  qatar: {
    security: "أمن,عسكري,قاعدة,إيران,defense,security,military,Al Udeid,US base,Gulf",
    political: "حكومة,أمير,دبلوماسية,وساطة,mediation,Al Jazeera,Muslim Brotherhood,تميم,الثاني",
    economic: "اقتصاد,غاز,LNG,استثمار,تجارة,QIA,World Cup,tourism,ريال قطري",
  },

  // KUWAIT - Arabic
  kuwait: {
    security: "أمن,عسكري,حدود,defense,security,military,Gulf,Iraq,Iran",
    political: "حكومة,أمير,مجلس الأمة,برلمان,انتخابات,دستور,Kuwait",
    economic: "اقتصاد,نفط,OPEC,استثمار,ميزانية,دينار,KIA,صندوق الأجيال",
  },

  // BAHRAIN - Arabic
  bahrain: {
    security: "أمن,عسكري,defense,security,military,Gulf,Iran,US Navy,Fifth Fleet,الأسطول الخامس",
    political: "حكومة,ملك,برلمان,انتخابات,شيعة,سنة,Abraham Accords,حمد,البحرين",
    economic: "اقتصاد,نفط,مالية,استثمار,بنوك,tourism,دينار بحريني",
  },

  // OMAN - Arabic
  oman: {
    security: "أمن,عسكري,defense,security,military,Gulf,Iran,neutrality,حياد,Strait of Hormuz,مضيق هرمز",
    political: "حكومة,سلطان,هيثم,دبلوماسية,وساطة,mediation,neutrality",
    economic: "اقتصاد,نفط,غاز,استثمار,تجارة,سياحة,ريال عماني,Vision 2040",
  },

  // YEMEN - Arabic
  yemen: {
    security: "حرب,صراع,حوثي,Houthi,Saudi,coalition,عسكري,هجوم,attack,missile,drone,مأرب,صنعاء,عدن",
    political: "حكومة,انتقالي,شرعية,مجلس,رئيس,Hadi,PLC,STC,peace talks,مفاوضات,هدنة",
    economic: "اقتصاد,أزمة,مساعدات,إنسانية,humanitarian,ريال,نفط,oil,port,ميناء",
  },

  // LEBANON - Arabic/French
  lebanon: {
    security: "جيش,أمن,حزب الله,Hezbollah,إسرائيل,Israel,سوريا,Syria,حدود,border,صراع,conflict",
    political: "حكومة,برلمان,رئيس,طائفية,sectarian,الحريري,عون,بري,انتخابات,أزمة,crisis,فراغ",
    economic: "اقتصاد,أزمة,ليرة,بنوك,انهيار,collapse,IMF,مصرف,inflation,دولار",
  },

  // JORDAN - Arabic
  jordan: {
    security: "جيش,أمن,حدود,إسرائيل,سوريا,العراق,defense,security,military,border,terrorism",
    political: "حكومة,ملك,عبدالله,برلمان,انتخابات,إصلاح,reform,قانون",
    economic: "اقتصاد,دينار,ميزانية,مساعدات,IMF,استثمار,سياحة,بطالة,unemployment",
  },

  // SYRIA - Arabic
  syria: {
    security: "جيش,حرب,صراع,أسد,Assad,روسيا,إيران,تركيا,داعش,ISIS,كرد,Kurdish,إدلب,حلب",
    political: "حكومة,نظام,معارضة,opposition,بشار,Assad,مفاوضات,انتقال,transition,عقوبات,sanctions",
    economic: "اقتصاد,ليرة,عقوبات,إعمار,reconstruction,نفط,oil,أزمة,crisis",
  },

  // PALESTINE - Arabic
  palestine: {
    security: "مقاومة,حماس,Hamas,فتح,Fatah,إسرائيل,Israel,غزة,Gaza,الضفة,West Bank,انتفاضة,occupation,احتلال",
    political: "سلطة,PA,حكومة,عباس,Abbas,انتخابات,وحدة,unity,PLO,منظمة التحرير",
    economic: "اقتصاد,حصار,blockade,مساعدات,aid,بطالة,unemployment,إعمار,reconstruction",
  },

  // ============================================================================
  // EAST ASIA
  // ============================================================================

  // CHINA - Chinese
  china: {
    security: "军事,解放军,PLA,国防,安全,边境,台湾,Taiwan,南海,South China Sea,导弹,missile,航母,核武,nuclear",
    political: "政府,共产党,CCP,习近平,Xi Jinping,全国人大,NPC,政治局,外交部,一带一路,BRI,港澳台",
    economic: "经济,GDP,人民币,yuan,RMB,贸易,trade,tariff,关税,投资,一带一路,房地产,债务,制裁,sanctions",
  },

  // JAPAN - Japanese
  japan: {
    security: "自衛隊,防衛,安全保障,国防,中国,北朝鮮,ミサイル,missile,尖閣,Senkaku,日米同盟,alliance",
    political: "政府,国会,首相,岸田,自民党,LDP,野党,選挙,法律,憲法,改憲",
    economic: "経済,GDP,円,yen,貿易,輸出,輸入,投資,日銀,BOJ,インフレ,inflation,半導体,semiconductor",
  },

  // SOUTH KOREA - Korean
  south_korea: {
    security: "군사,국방,안보,북한,North Korea,미사일,missile,핵,nuclear,한미동맹,alliance,DMZ,서해,NLL",
    political: "정부,국회,대통령,윤석열,Yoon,여당,야당,선거,법안,탄핵,국민의힘,더불어민주당",
    economic: "경제,GDP,원화,won,무역,수출,수입,투자,한국은행,BOK,인플레이션,반도체,Samsung,삼성",
  },

  // TAIWAN - Chinese (Traditional)
  taiwan: {
    security: "軍事,國防,安全,中國,China,解放軍,PLA,飛彈,missile,海峽,strait,美國,US,軍售,arms sale",
    political: "政府,立法院,總統,賴清德,Lai,民進黨,DPP,國民黨,KMT,選舉,兩岸,cross-strait",
    economic: "經濟,GDP,新台幣,NTD,貿易,出口,進口,投資,央行,晶片,semiconductor,TSMC,台積電",
  },

  // NORTH KOREA - Korean
  north_korea: {
    security: "군사,핵,nuclear,미사일,missile,ICBM,핵실험,test,김정은,Kim Jong Un,조선인민군,KPA,위협,threat",
    political: "정권,김정은,Kim,노동당,party,제재,sanctions,대남,south,대미,US,핵협상,talks",
    economic: "경제,제재,sanctions,핵,무역,밀수,smuggling,가상화폐,cryptocurrency,원조,aid",
  },

  // ============================================================================
  // SOUTHEAST ASIA
  // ============================================================================

  // VIETNAM - Vietnamese
  vietnam: {
    security: "quân đội,quốc phòng,an ninh,Trung Quốc,China,Biển Đông,South China Sea,lãnh thổ,territorial",
    political: "chính phủ,Quốc hội,Đảng,Communist Party,Chủ tịch,Tổng Bí thư,bầu cử,luật",
    economic: "kinh tế,GDP,đồng,VND,thương mại,xuất khẩu,nhập khẩu,đầu tư,FDI,EVFTA",
  },

  // MYANMAR - Burmese
  myanmar: {
    security: "စစ်တပ်,military,junta,စစ်အာဏာသိမ်း,coup,NUG,PDF,resistance,တိုက်ပွဲ,conflict,Rohingya",
    political: "အစိုးရ,government,စစ်ကောင်စီ,SAC,NLD,ဒီမိုကရေစီ,democracy,အောင်ဆန်းစုကြည်,Suu Kyi,ရွေးကောက်ပွဲ",
    economic: "စီးပွားရေး,economy,ကျပ်,kyat,ကုန်သွယ်ရေး,trade,ပိတ်ဆို့,sanctions,ငွေကြေး,currency",
  },

  // THAILAND - Thai
  thailand: {
    security: "ทหาร,กองทัพ,ความมั่นคง,กลาโหม,ชายแดน,เมียนมา,Myanmar,ภาคใต้,south",
    political: "รัฐบาล,สภา,นายกรัฐมนตรี,เศรษฐา,พรรค,เลือกตั้ง,กฎหมาย,รัฐธรรมนูญ,Move Forward,ก้าวไกล",
    economic: "เศรษฐกิจ,GDP,บาท,baht,การค้า,ส่งออก,นำเข้า,ลงทุน,ท่องเที่ยว,tourism,ธนาคาร",
  },

  // SINGAPORE - English/Chinese/Malay
  singapore: {
    security: "military,SAF,defence,security,regional,ASEAN,South China Sea,terrorism",
    political: "government,Parliament,Prime Minister,Lawrence Wong,PAP,election,legislation",
    economic: "economy,GDP,dollar,SGD,trade,export,import,investment,finance,MAS,inflation",
  },

  // MALAYSIA - Malay/English
  malaysia: {
    security: "tentera,pertahanan,keselamatan,sempadan,Filipina,Indonesia,Laut China Selatan,South China Sea",
    political: "kerajaan,parlimen,Perdana Menteri,Anwar,UMNO,PH,pilihan raya,undang-undang,1MDB",
    economic: "ekonomi,KDNK,ringgit,perdagangan,eksport,import,pelaburan,BNM,inflasi",
  },

  // INDONESIA - Indonesian
  indonesia: {
    security: "militer,TNI,pertahanan,keamanan,perbatasan,Papua,Laut China Selatan,South China Sea,terorisme",
    political: "pemerintah,DPR,Presiden,Prabowo,PDIP,Gerindra,pemilu,undang-undang,hukum",
    economic: "ekonomi,GDP,rupiah,perdagangan,ekspor,impor,investasi,Bank Indonesia,inflasi,nikel,kelapa sawit",
  },

  // PHILIPPINES - Filipino/English
  philippines: {
    security: "military,AFP,defense,security,South China Sea,China,West Philippine Sea,Spratlys,terrorism,NPA,insurgency",
    political: "government,Congress,President,Marcos,Duterte,election,legislation,law,opposition",
    economic: "economy,GDP,peso,PHP,trade,export,import,investment,BSP,inflation,OFW,remittances",
  },

  // CAMBODIA - Khmer
  cambodia: {
    security: "កងទ័ព,military,ការពារជាតិ,defense,សន្តិសុខ,security,ព្រំដែន,border,វៀតណាម,ថៃ",
    political: "រដ្ឋាភិបាល,government,សភា,ព្រះមហាក្សត្រ,King,ហ៊ុន សែន,Hun Sen,បក្ស,party,CPP,ការបោះឆ្នោត",
    economic: "សេដ្ឋកិច្ច,economy,រៀល,riel,ពាណិជ្ជកម្ម,trade,វិនិយោគ,investment,ទេសចរណ៍,tourism,សម្លៀកបំពាក់,garment",
  },

  // LAOS - Lao
  laos: {
    security: "ທະຫານ,military,ປ້ອງກັນ,defense,ຄວາມປອດໄພ,security,ຊາຍແດນ,border,ຈີນ,ຫວຽດນາມ",
    political: "ລັດຖະບານ,government,ສະພາ,ປະທານ,President,ພັກ,party,LPRP,ກົດໝາຍ,law",
    economic: "ເສດຖະກິດ,economy,ກີບ,kip,ການຄ້າ,trade,ການລົງທຶນ,investment,ໄຟຟ້າ,electricity,hydropower",
  },

  // ============================================================================
  // SOUTH ASIA
  // ============================================================================

  // INDIA - Hindi/English
  india: {
    security: "सेना,army,रक्षा,defence,सुरक्षा,security,सीमा,border,पाकिस्तान,Pakistan,चीन,China,कश्मीर,Kashmir,आतंकवाद,terrorism,परमाणु,nuclear",
    political: "सरकार,government,संसद,Parliament,प्रधानमंत्री,PM,Modi,मोदी,BJP,Congress,चुनाव,election,कानून,law,विधेयक",
    economic: "अर्थव्यवस्था,economy,GDP,रुपया,rupee,INR,व्यापार,trade,निर्यात,export,आयात,import,निवेश,investment,RBI,मुद्रास्फीति,inflation",
  },

  // PAKISTAN - Urdu/English
  pakistan: {
    security: "فوج,army,دفاع,defence,سیکورٹی,security,سرحد,border,بھارت,India,کشمیر,Kashmir,دہشتگردی,terrorism,افغانستان,Afghanistan,ایٹمی,nuclear",
    political: "حکومت,government,پارلیمنٹ,parliament,وزیراعظم,PM,عمران خان,Imran Khan,شریف,Sharif,فوج,military,الیکشن,election,قانون,law",
    economic: "معیشت,economy,GDP,روپیہ,rupee,PKR,تجارت,trade,برآمدات,exports,درآمدات,imports,سرمایہ کاری,investment,اسٹیٹ بینک,SBP,مہنگائی,inflation,IMF",
  },

  // BANGLADESH - Bengali
  bangladesh: {
    security: "সেনা,army,প্রতিরক্ষা,defence,নিরাপত্তা,security,সীমান্ত,border,রোহিঙ্গা,Rohingya,সন্ত্রাস,terrorism,ভারত,India,মিয়ানমার,Myanmar",
    political: "সরকার,government,সংসদ,parliament,প্রধানমন্ত্রী,PM,হাসিনা,Hasina,আওয়ামী,Awami,বিএনপি,BNP,নির্বাচন,election,আইন,law",
    economic: "অর্থনীতি,economy,GDP,টাকা,taka,BDT,বাণিজ্য,trade,রপ্তানি,export,আমদানি,import,বিনিয়োগ,investment,বাংলাদেশ ব্যাংক,BB,মুদ্রাস্ফীতি,inflation,গার্মেন্টস,garments",
  },

  // SRI LANKA - Sinhala/Tamil
  sri_lanka: {
    security: "හමුදාව,army,ආරක්ෂාව,defence,ආරක්ෂාව,security,தமிழ்,Tamil,LTTE,terrorism,India,China",
    political: "රජය,government,පාර්ලිමේන්තුව,parliament,ජනාධිපති,President,Ranil,Rajapaksa,වරණ,election,சட்டம்,law,IMF",
    economic: "ආර්ථිකය,economy,GDP,රුපියල,rupee,LKR,වෙළඳාම,trade,ஏற்றுமதி,export,இறக்குமதி,import,முதலீடு,investment,Central Bank,நெருக்கடி,crisis,debt",
  },

  // NEPAL - Nepali
  nepal: {
    security: "सेना,army,रक्षा,defence,सुरक्षा,security,सीमा,border,भारत,India,चीन,China,माओवादी,Maoist",
    political: "सरकार,government,संसद,parliament,प्रधानमन्त्री,PM,ओली,Oli,देउवा,Deuba,चुनाव,election,कानुन,law,गणतन्त्र,republic",
    economic: "अर्थतन्त्र,economy,GDP,रुपैयाँ,rupee,NPR,व्यापार,trade,निर्यात,export,आयात,import,लगानी,investment,राष्ट्र बैंक,NRB,पर्यटन,tourism,रेमिट्यान्स,remittance",
  },

  // AFGHANISTAN - Dari/Pashto
  afghanistan: {
    security: "طالبان,Taliban,امنیت,security,جنگ,war,ISIS-K,داعش,حمله,attack,مرز,border,پاکستان,Pakistan",
    political: "حکومت,government,طالبان,Taliban,امارت,Emirate,شریعت,Sharia,زنان,women,تحریم,sanctions",
    economic: "اقتصاد,economy,افغانی,afghani,تجارت,trade,بحران,crisis,کمک,aid,humanitarian,بشردوستانه",
  },

  // ============================================================================
  // CENTRAL ASIA
  // ============================================================================

  // KAZAKHSTAN - Kazakh/Russian
  kazakhstan: {
    security: "қарулы күштер,армия,қорғаныс,оборона,қауіпсіздік,безопасность,шекара,граница,Россия,Қытай",
    political: "үкімет,правительство,парламент,президент,Тоқаев,Токаев,сайлау,выборы,заң,закон,Nur Otan",
    economic: "экономика,ЖІӨ,ВВП,теңге,тенге,сауда,торговля,мұнай,нефть,gas,газ,инвестиция",
  },

  // UZBEKISTAN - Uzbek/Russian
  uzbekistan: {
    security: "qurolli kuchlar,армия,mudofaa,оборона,xavfsizlik,безопасность,chegara,граница,Afg'oniston,Афганистан",
    political: "hukumat,правительство,parlament,prezident,Mirziyoyev,Мирзиёев,saylov,выборы,qonun,закон",
    economic: "iqtisodiyot,экономика,YaIM,ВВП,so'm,сум,savdo,торговля,paxta,хлопок,investitsiya,инвестиция",
  },

  // TURKMENISTAN - Turkmen/Russian
  turkmenistan: {
    security: "goşun,армия,goranyş,оборона,howpsuzlyk,безопасность,serhet,граница,Owganystan,Афганистан,Iran",
    political: "hökümet,правительство,prezident,Berdimuhamedow,Бердымухамедов,kanun,закон",
    economic: "ykdysadyýet,экономика,JIÖ,ВВП,manat,манат,söwda,торговля,gaz,газ,nebit,нефть",
  },

  // KYRGYZSTAN - Kyrgyz/Russian
  kyrgyzstan: {
    security: "аскер,армия,коргоо,оборона,коопсуздук,безопасность,чек ара,граница,Тажикстан,Таджикистан,conflict",
    political: "өкмөт,правительство,парламент,президент,Жапаров,шайлоо,выборы,мыйзам,закон,революция",
    economic: "экономика,ЖИӨ,ВВП,сом,сом,соода,торговля,алтын,золото,инвестиция,remittances,Russia",
  },

  // TAJIKISTAN - Tajik/Russian
  tajikistan: {
    security: "артиш,армия,мудофиа,оборона,амният,безопасность,сарҳад,граница,Афғонистон,Афганистан,Қирғизистон",
    political: "ҳукумат,правительство,парламент,президент,Раҳмон,Рахмон,интихобот,выборы,қонун,закон",
    economic: "иқтисодиёт,экономика,СДМ,ВВП,сомонӣ,сомони,савдо,торговля,алюминий,инвестиция,remittances",
  },

  // ============================================================================
  // AFRICA
  // ============================================================================

  // EGYPT - Arabic
  egypt: {
    security: "جيش,army,دفاع,defense,أمن,security,حدود,border,إسرائيل,Israel,غزة,Gaza,سيناء,Sinai,إرهاب,terrorism",
    political: "حكومة,government,برلمان,parliament,رئيس,President,السيسي,Sisi,انتخابات,election,قانون,law,معارضة,opposition",
    economic: "اقتصاد,economy,جنيه,pound,EGP,تجارة,trade,صادرات,exports,واردات,imports,استثمار,investment,قناة السويس,Suez Canal,سياحة,tourism,IMF",
  },

  // NIGERIA - English/Hausa/Yoruba/Igbo
  nigeria: {
    security: "military,army,security,Boko Haram,ISWAP,bandits,kidnapping,Niger Delta,terrorism,conflict,insurgency",
    political: "government,National Assembly,President,Tinubu,APC,PDP,election,law,constitution,state",
    economic: "economy,GDP,naira,NGN,trade,oil,OPEC,export,import,investment,CBN,inflation,unemployment",
  },

  // SOUTH AFRICA - English/Afrikaans/Zulu
  south_africa: {
    security: "military,SANDF,security,crime,violence,xenophobia,border,Mozambique,Zimbabwe",
    political: "government,Parliament,President,Ramaphosa,ANC,DA,EFF,MK,election,law,constitution,coalition,GNU",
    economic: "economy,GDP,rand,ZAR,trade,export,import,investment,SARB,inflation,unemployment,Eskom,load shedding",
  },

  // KENYA - English/Swahili
  kenya: {
    security: "jeshi,military,usalama,security,mpaka,border,Al-Shabaab,Somalia,terrorism,police",
    political: "serikali,government,bunge,Parliament,Rais,President,Ruto,Kenya Kwanza,Azimio,uchaguzi,election,sheria,law",
    economic: "uchumi,economy,pato,GDP,shilingi,shilling,KES,biashara,trade,uwekezaji,investment,CBK,mfumuko,inflation",
  },

  // ETHIOPIA - Amharic
  ethiopia: {
    security: "ጦር,military,መከላከያ,defense,ደህንነት,security,ድንበር,border,ኤርትራ,Eritrea,ትግራይ,Tigray,ጦርነት,war,conflict",
    political: "መንግስት,government,ፓርላማ,parliament,ጠቅላይ ሚኒስትር,PM,አብይ,Abiy,ምርጫ,election,ህግ,law,Prosperity Party",
    economic: "ኢኮኖሚ,economy,GDP,ብር,birr,ETB,ንግድ,trade,ኢንቨስትመንት,investment,NBE,ግሽበት,inflation,Grand Ethiopian Renaissance Dam,GERD",
  },

  // SUDAN - Arabic
  sudan: {
    security: "جيش,army,دعم سريع,RSF,حرب,war,صراع,conflict,دارفور,Darfur,أمن,security,ميليشيا,militia",
    political: "حكومة,government,انقلاب,coup,البرهان,Burhan,حميدتي,Hemedti,انتقال,transition,مدنيين,civilian",
    economic: "اقتصاد,economy,جنيه,pound,SDG,تجارة,trade,نفط,oil,أزمة,crisis,مساعدات,humanitarian,aid",
  },

  // DR CONGO - French/Lingala/Swahili
  dr_congo: {
    security: "armée,FARDC,sécurité,security,frontière,border,M23,ADF,FDLR,conflit,conflict,Kivu,MONUSCO",
    political: "gouvernement,parlement,président,Tshisekedi,élection,loi,law,opposition,constitution",
    economic: "économie,economy,franc,CDF,commerce,trade,cobalt,coltan,mining,minerais,investissement",
  },

  // ============================================================================
  // AMERICAS
  // ============================================================================

  // USA - English
  usa: {
    security: "military,Pentagon,defense,DOD,security,border,terrorism,NATO,nuclear,China,Russia,Iran,Taiwan",
    political: "government,Congress,Senate,House,President,Biden,Trump,Republican,Democrat,election,legislation,Supreme Court",
    economic: "economy,GDP,dollar,USD,trade,tariff,export,import,investment,Federal Reserve,Fed,inflation,employment",
  },

  // CANADA - English/French
  canada: {
    security: "military,CAF,defence,sécurité,border,frontière,NATO,NORAD,Arctic,Arctique,terrorism",
    political: "government,gouvernement,Parliament,Parlement,Prime Minister,Trudeau,Liberal,Conservative,election,élection,law,loi",
    economic: "economy,économie,GDP,PIB,dollar,CAD,trade,commerce,export,import,investment,Bank of Canada,inflation",
  },

  // MEXICO - Spanish
  mexico: {
    security: "ejército,militar,seguridad,frontera,border,cartel,narco,violencia,crimen,AMLO,Guardia Nacional",
    political: "gobierno,Congreso,Senado,Presidente,Sheinbaum,MORENA,PRI,PAN,elecciones,ley,constitución,reforma",
    economic: "economía,PIB,peso,MXN,comercio,USMCA,T-MEC,exportación,importación,inversión,Banxico,inflación,nearshoring",
  },

  // BRAZIL - Portuguese
  brazil: {
    security: "forças armadas,exército,defesa,segurança,fronteira,crime,violência,Amazônia,Amazon,tráfico",
    political: "governo,Congresso,Senado,Presidente,Lula,Bolsonaro,PT,PL,eleições,lei,STF,constituição",
    economic: "economia,PIB,real,BRL,comércio,exportação,importação,investimento,Banco Central,inflação,Petrobras,agronegócio",
  },

  // ARGENTINA - Spanish
  argentina: {
    security: "fuerzas armadas,ejército,defensa,seguridad,frontera,Malvinas,Falklands",
    political: "gobierno,Congreso,Senado,Presidente,Milei,Peronismo,La Libertad Avanza,elecciones,ley,dolarización",
    economic: "economía,PIB,peso,ARS,comercio,exportación,importación,inversión,Banco Central,inflación,FMI,IMF,dólar,cepo",
  },

  // COLOMBIA - Spanish
  colombia: {
    security: "fuerzas armadas,ejército,seguridad,FARC,ELN,narcotráfico,guerrilla,violencia,paz,peace",
    political: "gobierno,Congreso,Presidente,Petro,elecciones,ley,paz,acuerdo,oposición",
    economic: "economía,PIB,peso,COP,comercio,exportación,café,petróleo,inversión,Banco de la República,inflación",
  },

  // VENEZUELA - Spanish
  venezuela: {
    security: "fuerzas armadas,ejército,seguridad,guardia nacional,frontera,Colombia,Guyana,Esequibo",
    political: "gobierno,Asamblea Nacional,Presidente,Maduro,oposición,PSUV,elecciones,sanciones,sanctions,Guaidó,María Corina",
    economic: "economía,PIB,bolívar,petróleo,PDVSA,hiperinflación,crisis,sanciones,sanctions,dolarización",
  },

  // CUBA - Spanish
  cuba: {
    security: "fuerzas armadas,ejército,seguridad,embargo,bloqueo,US,EEUU",
    political: "gobierno,Asamblea Nacional,Presidente,Díaz-Canel,PCC,partido comunista,protestas,oposición",
    economic: "economía,peso,CUP,MLC,crisis,racionamiento,turismo,remesas,embargo,bloqueo,inversión",
  },

  // CHILE - Spanish
  chile: {
    security: "fuerzas armadas,ejército,defensa,seguridad,frontera,Bolivia,Argentina,Mapuche",
    political: "gobierno,Congreso,Senado,Presidente,Boric,elecciones,constitución,ley,izquierda,derecha",
    economic: "economía,PIB,peso,CLP,cobre,copper,comercio,exportación,inversión,Banco Central,inflación,pensiones,AFP",
  },

  // PERU - Spanish
  peru: {
    security: "fuerzas armadas,ejército,seguridad,Sendero Luminoso,narcotráfico,protestas,estado de emergencia",
    political: "gobierno,Congreso,Presidente,Boluarte,elecciones,ley,crisis,vacancia,corrupción,Castillo",
    economic: "economía,PIB,sol,PEN,minería,cobre,oro,exportación,inversión,BCRP,inflación",
  },
};

/**
 * Get country-specific keywords or fall back to defaults
 * Supports partial matching and common aliases
 */
export function getCountryKeywords(country: string): CountryKeywords {
  const normalized = country.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');

  // Try exact match first
  if (COUNTRY_KEYWORDS[normalized]) {
    return COUNTRY_KEYWORDS[normalized];
  }

  // Common aliases
  const aliases: Record<string, string> = {
    'britain': 'uk',
    'united_kingdom': 'uk',
    'england': 'uk',
    'scotland': 'uk',
    'wales': 'uk',
    'united_states': 'usa',
    'america': 'usa',
    'us': 'usa',
    'prc': 'china',
    'peoples_republic_of_china': 'china',
    'rok': 'south_korea',
    'republic_of_korea': 'south_korea',
    'korea': 'south_korea',
    'dprk': 'north_korea',
    'roc': 'taiwan',
    'republic_of_china': 'taiwan',
    'formosa': 'taiwan',
    'persia': 'iran',
    'burma': 'myanmar',
    'holland': 'netherlands',
    'ussr': 'russia',
    'soviet_union': 'russia',
    'czechia': 'czech',
    'czech_republic': 'czech',
    'bosnia_and_herzegovina': 'bosnia',
    'bosnia_herzegovina': 'bosnia',
    'macedonia': 'north_macedonia',
    'fyrom': 'north_macedonia',
    'drc': 'dr_congo',
    'democratic_republic_of_congo': 'dr_congo',
    'congo_kinshasa': 'dr_congo',
    'zaire': 'dr_congo',
    'ivory_coast': 'cote_divoire',
  };

  if (aliases[normalized] && COUNTRY_KEYWORDS[aliases[normalized]]) {
    return COUNTRY_KEYWORDS[aliases[normalized]];
  }

  // Try partial match
  for (const [key, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return keywords;
    }
  }

  // Return generic English keywords as fallback
  return {
    security: "NATO,military,defense,army,war,conflict,attack,security,troops,border,missile,invasion,strike,weapons,soldiers,terrorism,nuclear",
    political: "government,president,prime minister,minister,election,parliament,diplomatic,summit,policy,coalition,opposition,foreign,bilateral,legislation,law",
    economic: "economy,trade,sanctions,tariff,inflation,GDP,budget,investment,crisis,bank,currency,export,import,central bank,debt,growth",
  };
}

/**
 * Get all available country codes
 */
export function getAvailableCountries(): string[] {
  return Object.keys(COUNTRY_KEYWORDS);
}

/**
 * Check if a country has dedicated keywords
 */
export function hasCountryKeywords(country: string): boolean {
  const normalized = country.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  return COUNTRY_KEYWORDS[normalized] !== undefined;
}
