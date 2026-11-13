# Samsung TV Remote Card

Card per Home Assistant a forma di telecomando, pensata per i TV Samsung con Tizen.

Richiede l'integrazione **[Samsung TV (Tizen)](https://github.com/pierpa71/ha-samsung-tizen)**, da cui prende l'elenco delle app e a cui manda i comandi.

## Funzioni
- Accensione, sorgenti (TV/HDMI) e tastierino numerico
- Pad direzionale con OK, Indietro, Home, Esci
- Bilancieri volume e canale, muto, info, guida TV
- Riproduzione e tasti colorati
- App del TV con le principali in evidenza e un elenco completo
- Ripetizione dei comandi tenendo premuto; da computer si usano anche le frecce e i numeri della tastiera

## Installazione

**HACS:** HACS → menu ⋮ → *Repository personalizzati* → aggiungi `https://github.com/pierpa71/samsung-remote-card` con categoria **Dashboard** → installa → ricarica la pagina.

**Manuale:**
1. Copia `samsung-remote-card.js` in `config/www/`.
2. Aggiungi la risorsa da *Impostazioni → Dashboard → ⋮ → Risorse*, con URL `/local/samsung-remote-card.js` e tipo *Modulo JavaScript*.

## Configurazione

```yaml
type: custom:samsung-remote-card
entity: media_player.samsung_tv          # obbligatorio
remote: remote.samsung_tv_remote         # facoltativo: se manca, viene cercato sullo stesso dispositivo
apps: [Netflix, YouTube, RaiPlay, DAZN]  # facoltativo: le app in evidenza
sources: [TV, HDMI 1, HDMI 2]            # facoltativo
name: Soggiorno                          # facoltativo
```
