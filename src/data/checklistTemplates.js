export const INSPECTION_TYPES = [
  'Apartmán / pokoj',
  'Společné prostory',
  'Firma / proces',
  'Komunikace s hosty',
  'Úklidový proces',
  'Check-in / check-out',
]

function section(id, title, items) {
  return {
    id,
    title,
    items: items.map((itemTitle, index) => ({
      id: `${id}-${index + 1}`,
      title: itemTitle,
    })),
  }
}

export const CHECKLIST_TEMPLATES = [
  {
    id: 'apartment-room',
    type: 'Apartmán / pokoj',
    title: 'Apartmán / pokoj',
    description: 'Detail prostoru pro pobyt hosta a jeho okamžitý dojem.',
    sections: [
      section('cleanliness', 'Čistota', [
        'Podlahy, povrchy a rohy bez viditelných nečistot',
        'Prachosběrná místa, lišty a vypínače',
      ]),
      section('bathroom', 'Koupelna', [
        'Umyvadlo, sprcha a toaleta bez usazenin',
        'Ručníky, kosmetika a doplnění zásob',
      ]),
      section('bed', 'Postel / textil', [
        'Povlečení, matrace a celkový pocit čistoty',
        'Deky, polštáře a náhradní textil',
      ]),
      section('equipment', 'Vybavení', [
        'Kuchyňské minimum a drobné vybavení',
        'Ovladače, lampy a základní funkčnost',
      ]),
      section('technical', 'Technický stav', [
        'Dveře, okna a zámky',
        'Elektro, voda a drobné závady',
      ]),
      section('comfort', 'Hluk / komfort', [
        'Tepelný komfort a větrání',
        'Rušivé zvuky, pachy a soukromí',
      ]),
      section('checkin-info', 'Check-in info v apartmánu', [
        'Viditelnost instrukcí pro hosta',
        'Přesnost a aktuálnost informací v jednotce',
      ]),
    ],
  },
  {
    id: 'common-areas',
    type: 'Společné prostory',
    title: 'Společné prostory',
    description: 'První dojem a provozní pořádek mimo samotnou jednotku.',
    sections: [
      section('entry', 'Vstup a orientace', [
        'Příchod ke vstupu a čitelnost značení',
        'Přístupnost klíčových bodů pro hosta',
      ]),
      section('shared-cleanliness', 'Čistota společných prostor', [
        'Chodby, schodiště a odpadkové zóny',
        'Výtah, vstupní dveře a madla',
      ]),
      section('safety', 'Bezpečnost', [
        'Nouzové značení a potenciální rizika',
        'Osvětlení a bezpečný pohyb po objektu',
      ]),
      section('shared-tech', 'Technický stav', [
        'Dveře, zvonky, čipy a vstupní systémy',
        'Viditelné závady nebo opotřebení',
      ]),
      section('shared-stock', 'Zásoby a vybavení', [
        'Doplňkové vybavení pro hosty a tým',
        'Spotřební materiál a pořádek ve skladech',
      ]),
      section('shared-comms', 'Komunikace informací', [
        'Aktuálnost interních cedulí a instrukcí',
        'Přehlednost informací pro hosta',
      ]),
    ],
  },
  {
    id: 'business-process',
    type: 'Firma / proces',
    title: 'Firma / proces',
    description: 'Provozní systém a toky informací v týmu.',
    sections: [
      section('guest-comms', 'Komunikace s hosty', [
        'Rychlost a konzistence odpovědí',
        'Jasnost a úplnost zpráv',
      ]),
      section('check-flow', 'Check-in / check-out', [
        'Předávání vstupních informací a odjezdu',
        'Práce s výjimkami a pozdními změnami',
      ]),
      section('clean-logistics', 'Úklidová logistika', [
        'Návaznost úklidu na obsazenost',
        'Koordinace zásob a prádla',
      ]),
      section('handover', 'Předávání informací', [
        'Předání problému mezi směnami nebo rolemi',
        'Jednotné místo pro důležité poznámky',
      ]),
      section('technical-issues', 'Technické problémy', [
        'Evidence závad a rychlost reakce',
        'Kdo co vlastní a kdo eskaluje',
      ]),
      section('ops-management', 'Řízení provozu', [
        'Denní kontrolní rutina a dohled',
        'Zřetelné priority a kapacita týmu',
      ]),
      section('repeating-errors', 'Opakující se chyby', [
        'Nejčastější problémy a jejich příčina',
        'Existence protiopatření a následné kontroly',
      ]),
    ],
  },
  {
    id: 'guest-communication',
    type: 'Komunikace s hosty',
    title: 'Komunikace s hosty',
    description: 'Samostatná kontrola kvality komunikace před pobytem i během něj.',
    sections: [
      section('speed', 'Rychlost odpovědi', [
        'První reakce na dotazy a incidenty',
        'Dodržení slibovaných časů odpovědi',
      ]),
      section('clarity', 'Jasnost zpráv', [
        'Jednoznačnost instrukcí bez domýšlení',
        'Srozumitelná struktura zpráv pro hosta',
      ]),
      section('tone', 'Tón a profesionalita', [
        'Empatie, jistota a profesionální tón',
        'Konzistence napříč kanály a situacemi',
      ]),
      section('issue-resolution', 'Řešení problémů', [
        'Navržení dalšího kroku místo přeposílání',
        'Uzavření problému a potvrzení s hostem',
      ]),
    ],
  },
  {
    id: 'cleaning-process',
    type: 'Úklidový proces',
    title: 'Úklidový proces',
    description: 'Kontrola zadání, návazností a kvality úklidu.',
    sections: [
      section('task-brief', 'Zadání úklidu', [
        'Jasnost zadání a očekávaný standard',
        'Specifické požadavky k jednotce',
      ]),
      section('timing', 'Časování', [
        'Dostatečný čas mezi hosty a úklidem',
        'Připravenost týmu na změny v harmonogramu',
      ]),
      section('info-transfer', 'Předání informací', [
        'Předání závad, ztrát a nestandardů',
        'Aktualizace stavu po dokončení úklidu',
      ]),
      section('quality-check', 'Kontrola kvality', [
        'Fyzická nebo foto kontrola výsledku',
        'Jasný postup při nedostatku',
      ]),
      section('linen-stock', 'Prádlo / zásoby', [
        'Dostupnost prádla a doplňků',
        'Evidence spotřeby a doplnění',
      ]),
      section('escalation', 'Eskalace problému', [
        'Kdo řeší problém a kdy se eskaluje',
        'Rychlost reakce na kritický nedostatek',
      ]),
    ],
  },
  {
    id: 'checkin-checkout',
    type: 'Check-in / check-out',
    title: 'Check-in / check-out',
    description: 'Tok instrukcí a provozních kroků kolem příjezdu a odjezdu.',
    sections: [
      section('before-arrival', 'Před příjezdem', [
        'Včasnost check-in zprávy a instrukcí',
        'Dostupnost informací o vstupu a kontaktu',
      ]),
      section('arrival', 'Předání vstupu', [
        'Funkčnost vstupu a jednoduchost postupu',
        'Připravenost řešit problém na místě',
      ]),
      section('during-stay', 'Během pobytu', [
        'Dohled nad případnými komplikacemi po příjezdu',
        'Rychlost řešení problému po check-inu',
      ]),
      section('departure', 'Odjezd', [
        'Srozumitelnost check-out instrukcí',
        'Návaznost na úklid a další provoz',
      ]),
    ],
  },
]