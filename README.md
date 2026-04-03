# Provozní kontrola

Interní mobile-first MVP pro systematické provozní kontroly bez backendu. Aplikace běží čistě lokálně v prohlížeči a ukládá kontroly, poznámky i fotky do IndexedDB přes Dexie.

## Co umí

- založit novou kontrolu podle typu provozu
- pracovat s checklistem po sekcích
- ukládat status, prioritu, poznámku, důkaz a fotky ke každému bodu
- filtrovat jen slabé nebo kritické body
- uchovat rozepsanou kontrolu po reloadu stránky
- zobrazit souhrn kritických bodů a quick wins

## Spuštění

```bash
npm install
npm run dev
```

## Validace

```bash
npm run build
npm test
```
