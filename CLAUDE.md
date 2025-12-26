# 🚀 TRIPLINE - Documentation Projet

## 📋 Vue d'ensemble

**Tripline** est une application web de planification de voyages avec un design minimaliste Apple en mode clair, adoptant une interface moderne et épurée.

**Tagline :** "Your trips, on a timeline"

---

## 🎯 Concept & Vision

### Objectif principal
Créer un **trip planner universel** (multi-voyages) pour planifier n'importe quel voyage, pas seulement le Japon.

### Positionnement
- Alternative simple et moderne à TripIt, Wanderlog
- Focus mobile-first avec interface épurée
- Prix accessible (freemium ou one-time payment)
- Cible : voyageurs francophones

### Modèle économique envisagé
**Freemium :**
- ✅ Gratuit : 1 voyage, 50 items max
- 💎 Pro ($7-9/mois) : 10 voyages, illimité items, export PDF
- 🚀 Unlimited ($15/mois) : Tout illimité + collaboration

---

## 🏗️ Architecture Technique

### Stack actuel
- **Frontend :** HTML5 + CSS3 + JavaScript vanilla
- **Storage :** localStorage (client-side uniquement)
- **Icons :** Lucide Icons (open-source, style Apple)
- **Fichiers :**
  - `index.html` - Application complète standalone
  - Pas de data.json séparé (localStorage uniquement)

### Structure localStorage
```javascript
{
  "japanTripRestaurants": [...],
  "japanTripActivities": [...],
  "currentSort": "none",
  "theme": "light"
}
```

### Classes principales
```javascript
class Restaurant {
  constructor(name, city, cuisine, priceRange, googleMapsUrl, photoUrl, 
              tiktokLink, notes, isReserved, reservationDate, priority, 
              bookingUrl, id, isDone)
}

class Activity {
  constructor(name, city, category, date, time, duration, cost, 
              googleMapsUrl, photoUrl, tiktokLink, notes, isBooked, 
              reservationDate, priority, bookingUrl, id, isDone)
}
```

### Fonctions principales
- `loadData()` - Charge depuis localStorage
- `saveData()` - Sauvegarde dans localStorage
- `renderItems()` - Affichage des cards en grid
- `renderCalendar()` - Timeline horizontale par jour
- `exportData()` - Export JSON
- `importData()` - Import JSON
- `toggleDone()` - Marquer comme fait/pas fait

---

## 🎨 Design System Tripline v2.0 (Apple Minimaliste)

### Palette de couleurs (Apple Style)

**Bleus Apple :**
- Primary Blue (Light): `#007AFF` (iOS blue)
- Primary Blue (Dark): `#0A84FF` (iOS dark blue)
- Accent Blue: `#5AC8FA` (Cyan)

**Neutres :**
- BG Primary (Light): `#FFFFFF` (True white)
- BG Primary (Dark): `#000000` (True black)
- BG Secondary (Light): `#F5F5F7` (Off-white)
- BG Secondary (Dark): `#1C1C1E` (Dark gray)
- BG Tertiary (Light): `#E5E5EA`
- BG Tertiary (Dark): `#2C2C2E`

**Textes :**
- Text Primary: Dynamique selon theme
- Text Secondary: `#8E8E93` (Gray)
- Border Color: `rgba(0,0,0,0.06)` light / `rgba(255,255,255,0.08)` dark

**Accents :**
- Success: `#34C759` (iOS green)
- Warning: `#FF9F0A` (iOS orange)
- Error: `#FF3B30` (iOS red)

### Typographie
- **Police :** `-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`
- **Antialiasing :** `-webkit-font-smoothing: antialiased`
- **Logo :** Inter 700 avec gradient bleu
- **Titres :** SF Pro Display 600
- **Texte :** SF Pro Text 400-500

### Principes de design
✅ **Minimalisme Apple** - Design épuré, maximum de blanc
✅ **Pas de bordures** - Ombres subtiles uniquement
✅ **Border radius** - 12-16px (plus arrondis)
✅ **Backdrop blur** - Sur modals et overlays
✅ **Transitions fluides** - cubic-bezier(0.4, 0, 0.2, 1)
✅ **Mode clair par défaut** - Dark mode disponible
✅ **Mobile-first** - Optimisé pour mobile avant tout
✅ **Icons Lucide** - Icônes flat modernes (pas d'emojis)

---

## ✨ Features Implémentées (v2.0)

### 1. Gestion des items
- ✅ Ajouter restaurant/activité (FAB avec menu déroulant)
- ✅ Modifier un item
- ✅ Supprimer un item
- ✅ Marquer comme fait/pas fait (isDone)
- ✅ Tri automatique (items faits en bas avec opacité 0.5)

### 2. Système de priorités
- 🔴 Must-do (background rouge léger)
- 🟠 Haute (background orange léger)
- ⚪ Normale (background neutre)
- 🔵 Basse (opacité 0.7)
- ⚫ Optionnel (opacité 0.5)
- **Badge priorité** au-dessus du nom dans les cards

### 3. Organisation
- **Tabs :** Tout / Restaurants / Activités / Calendrier / Par Ville
- **Tri :** Par défaut, priorité, prix croissant/décroissant, nom A-Z
- **Filtres :** Recherche + ville + tri (design Apple mobile-first)

### 4. Vues disponibles
- **Liste Grid** - Cards photo en haut (280px min-width, responsive)
- **Timeline Calendrier** - Carousel horizontal par jour avec indicateurs ronds
- **Par ville** - Groupé par ville puis district

### 5. Interface moderne Apple

#### Header
- Logo Tripline avec icône avion
- Theme toggle (soleil/lune)
- Settings button (modal)

#### Search & Filters (Mobile-first)
- **Search bar** : Icône loupe intégrée, rounded input
- **Filters** : 2 selects côte à côte (desktop) ou empilés (mobile)
- Background blanc, focus ring bleu

#### Cards Design (Uniforme partout)
- **Photo full-width** en haut (140px height)
- **Badge priorité** visible
- **Titre + Ville + Notes (ellipsis 2 lignes) + Prix**
- **Boutons** : Icônes uniquement avec tooltips
  - Items non faits : ✓ Fait + Maps + Réserver
  - Items faits : ↩ Pas fait uniquement (pleine largeur)

#### Timeline Calendrier (Style Instagram)
- **Carousel horizontal** : Une card à la fois, swipe pour changer de jour
- **Scroll snap** : Centrage automatique quand on relâche
- **Indicateurs ronds** en bas (style Instagram Stories)
  - Petits ronds gris semi-transparents
  - Rond actif en bleu + plus gros
  - Cliquables pour navigation directe
- **Header de date** : Jour / Gros numéro / Mois
- **Cards empilées** verticalement par jour

#### Bottom Navigation (Mobile)
- 4 onglets : Tout / Restaurants / Activités / Calendrier
- Icônes Lucide avec labels
- Fixed en bas avec backdrop blur

#### Settings Modal
- Export JSON
- Import JSON
- Delete all data
- Accessible depuis le header

### 6. Dark Mode
- ✅ Toggle fonctionnel (🌙/☀️)
- ✅ True black (#000000) en dark mode
- ✅ Persistence dans localStorage
- ✅ Mode clair par défaut

### 7. Export/Import
- ✅ Export JSON (téléchargement)
- ✅ Import JSON (upload fichier)
- ✅ Clear all data (avec confirmation)

---

## 📂 Structure de données

### Restaurant
```json
{
  "id": "resto_xxx",
  "name": "Sushi Tokami",
  "city": "Tokyo - Ginza",
  "cuisine": "Omakase",
  "priceRange": 20000,
  "googleMapsUrl": "https://...",
  "photoUrl": "https://...",
  "tiktokLink": "",
  "notes": "Excellent rapport qualité/prix",
  "isReserved": false,
  "reservationDate": "2026-01-10T19:00",
  "priority": "high",
  "bookingUrl": "https://...",
  "type": "restaurant",
  "isDone": false
}
```

### Activity
```json
{
  "id": "activity_xxx",
  "name": "TeamLab Borderless",
  "city": "Tokyo - Odaiba",
  "category": "Musée digital",
  "date": "2026-01-15",
  "time": "14:00",
  "duration": 2.5,
  "cost": 3200,
  "googleMapsUrl": "https://...",
  "photoUrl": "",
  "tiktokLink": "",
  "notes": "Réservation en ligne recommandée",
  "isBooked": false,
  "reservationDate": "",
  "priority": "must-do",
  "bookingUrl": "",
  "type": "activity",
  "isDone": false
}
```

---

## 🚀 Roadmap - Prochaines étapes

### 🎯 Architecture Multi-voyages (PRIORITÉ #1)
**Objectif :** Passer d'une app mono-voyage à multi-voyages

**Changements nécessaires :**
```javascript
// Nouvelle structure localStorage
{
  "trips": [
    {
      "id": "trip_123",
      "name": "Japon 2026",
      "startDate": "2026-01-02",
      "endDate": "2026-01-30",
      "currency": "¥",
      "budget": 500000,
      "restaurants": [...],
      "activities": [...]
    }
  ],
  "currentTripId": "trip_123",
  "theme": "light"
}
```

**Features à ajouter :**
1. Page d'accueil avec liste des voyages
2. Bouton "Créer un voyage"
3. Switch entre voyages
4. CRUD complet sur les trips
5. Breadcrumb : Mes voyages > Japon 2026 > Restaurants

---

### 📊 TOP 5 Next Features

#### 1. Budget Tracker ⭐
```
Budget utilisé : 125,000¥ / 500,000¥
[████████░░░░░░░░] 25%
```
- Progress bar visuelle
- Alerte si dépassement
- Dashboard card

#### 2. Itinéraire optimisé 🗺️
- Calculer le meilleur ordre de visite
- Afficher temps de trajet entre lieux
- Détecter conflits horaires
- Google Maps API integration

#### 3. Météo 🌤️
- Intégrer API météo pour chaque ville
- Afficher dans le calendrier par jour
- Alertes température/pluie

#### 4. PWA & Offline Mode 📱
- Service Worker
- Cache des données
- Install prompt
- Fonctionne sans connexion

#### 5. Partage de voyage 🤝
- Générer lien partageable
- Vue read-only pour amis
- Export PDF amélioré avec itinéraire

---

### 🎨 Améliorations UX (Nice to have)

**Micro-interactions :**
- ✅ Animations d'entrée des cards (fade-in)
- ⏳ Pull to refresh
- ⏳ Skeleton loaders
- ⏳ Swipe pour marquer comme fait

**Gestures mobiles :**
- ⏳ Swipe left sur card → Delete
- ⏳ Swipe right sur card → Done
- ⏳ Long press → Quick actions

**Empty States :**
- ⏳ Illustrations SVG custom
- ⏳ Animations Lottie
- ⏳ Call-to-actions clairs

**Search améliorée :**
- ⏳ Recherche instantanée (debounce)
- ⏳ Highlight des résultats
- ⏳ Recherche dans notes

---

## 📱 Deployment

### GitHub Pages (Recommandé)
```
Structure repo:
├── index.html
└── README.md
```

**Setup :**
1. Upload le fichier sur GitHub
2. Settings → Pages → Source: main branch
3. URL finale : `https://username.github.io/tripline`

### Alternatives
- **Netlify Drop** - Drag & drop instantané
- **Vercel** - Import depuis GitHub
- **Cloudflare Pages** - CDN ultra rapide

---

## 🎁 Features Premium (Future)

Pour version payante :
- 🤝 **Collaboration** : Partager trip avec amis
- 📸 **Photos souvenirs** : Upload pendant voyage
- 🎒 **Packing list** : Checklist automatique
- 💰 **Split costs** : Partager les frais
- 🗺️ **Map view** : Carte interactive
- 📊 **Analytics** : Stats de voyage
- 🤖 **AI suggestions** : Recommendations IA
- 📄 **Export PDF Pro** : Itinéraire complet avec photos

---

## 🐛 Bugs connus & Limitations

### Limitations actuelles
- ❌ Pas de backend → Données locales uniquement
- ❌ Pas de sync entre appareils
- ❌ Pas de collaboration temps réel
- ❌ Un seul voyage à la fois
- ❌ Pas de géolocalisation
- ❌ Pas de carte interactive
- ❌ localStorage peut être vidé par le navigateur

### Points d'attention
- LocalStorage limité à ~5-10MB
- Données perdues si cache navigateur vidé
- Pas de backup automatique (export JSON manuel)
- Timeline fonctionne mieux avec dates complètes (date + heure)

---

## 💡 Décisions de design importantes

### Pourquoi Apple Minimaliste ?
- Plus moderne et épuré que flat design
- Meilleure lisibilité avec fond blanc
- Animations fluides et naturelles
- Icônes Lucide plus cohérentes qu'emojis
- Tendance design actuelle 2025

### Pourquoi Mode Clair par défaut ?
- Plus lisible en extérieur (voyages)
- Apple privilégie le clair
- Dark mode disponible pour confort nocturne

### Pourquoi Timeline Instagram Style ?
- Navigation intuitive (swipe)
- Focus sur un jour à la fois
- Indicateurs ronds familiers
- Mobile-first parfait

### Pourquoi Cards photo en haut ?
- Plus immersif
- Design uniforme partout
- Meilleure hiérarchie visuelle
- Comme Airbnb, Google Travel

### Pourquoi localStorage ?
- Prototype rapide sans backend
- Pas de coût d'hébergement
- Offline-first par défaut
- Privacy-first (données locales)
- Migration future vers backend possible

---

## 🔧 Comment continuer le projet

### Si tu reprends le projet dans une nouvelle conversation :

1. **Lire ce fichier CLAUDE.md** pour comprendre le contexte
2. **Charger index.html** pour voir le code actuel
3. **Tester l'app** pour comprendre l'UX actuelle
4. **Vérifier le design Apple** : fond blanc, icônes Lucide, timeline carousel

### Prochaines tâches suggérées (par ordre de priorité) :

**Phase 1 - Multi-voyages (Critique)**
1. Refacto localStorage pour structure multi-trips
2. Page d'accueil avec liste des voyages
3. Création/édition/suppression de trips
4. Switch entre trips

**Phase 2 - Smart Features**
1. Budget tracker avec progress bar
2. Itinéraire optimisé (ordre de visite)
3. Météo par jour
4. Conflits horaires

**Phase 3 - PWA**
1. Service Worker
2. Manifest.json
3. Offline mode
4. Install prompt

**Phase 4 - Premium**
1. Backend (Firebase/Supabase)
2. Auth (Google/Apple)
3. Sync multi-devices
4. Collaboration temps réel

---

## 📚 Ressources & Références

### Design
- **Inspiration** : Apple iOS, Instagram, Notion, Linear
- **Icons** : Lucide Icons (https://lucide.dev)
- **Fonts** : SF Pro Display (Apple system fonts)
- **Colors** : Apple HIG (Human Interface Guidelines)

### Technique
- **No framework** : Vanilla JS pour légèreté
- **Mobile-first** : CSS Grid + Flexbox
- **localStorage** : Client-side storage
- **Future** : IndexedDB ou Firebase

### Concurrents analysés
- TripIt ($49/an) - Trop complexe, UI datée
- Wanderlog (gratuit) - Features OK mais UI moche
- Google Trips (mort) - Opportunité à saisir
- Notion templates - Pas optimisé mobile

---

## 📞 Contact & Maintenance

**Créateur :** Dylan  
**Date de création :** Décembre 2025  
**Dernière mise à jour :** 26 décembre 2025  
**Version actuelle :** v2.0 (Apple Redesign + Timeline)

---

## 🎯 Philosophie du projet

> "Simple, beau, efficace. Un trip planner qui ne prend pas la tête."

**Principes :**
- Mobile-first toujours
- Design Apple minimaliste
- Performance avant tout
- UX intuitive
- Pas de bullshit features
- Privacy-first

**Non-négociables :**
- Pas de tracking utilisateur
- Pas de pub
- Données en local (privacy)
- Open source potentiel (à décider)
- Design cohérent et épuré

---

## ✅ Checklist avant lancement

### MVP (Minimum Viable Product)
- [x] Interface fonctionnelle
- [x] CRUD restaurants/activités
- [x] Export/Import JSON
- [x] Design Apple minimaliste
- [x] FAB button avec menu
- [x] Timeline carousel Instagram
- [x] isDone feature
- [x] Search & Filters mobile-first
- [x] Dark mode
- [ ] Multi-voyages
- [ ] Landing page
- [ ] Documentation utilisateur
- [ ] Tests multi-navigateurs
- [ ] PWA setup (offline)

### Marketing
- [ ] Nom de domaine (tripline.app)
- [ ] Logo professionnel
- [ ] Screenshots
- [ ] Video demo
- [ ] ProductHunt launch
- [ ] Reddit r/solotravel post
- [ ] Twitter/X announcement

---

## 🎨 Design Changelog

### v2.0 (26 décembre 2025) - Apple Redesign
- ✅ Migration vers design Apple minimaliste
- ✅ Remplacement emojis par Lucide Icons
- ✅ Cards photo en haut (layout uniforme)
- ✅ Timeline carousel Instagram avec indicateurs ronds
- ✅ Search & Filters redesign mobile-first
- ✅ Mode clair par défaut (true white + true black)
- ✅ isDone feature avec tri automatique
- ✅ Settings dans le header (modal)
- ✅ Boutons compacts (icônes + tooltips)
- ✅ Badge priorité au-dessus du nom
- ✅ Notes en ellipsis (2 lignes)

### v1.0 (Décembre 2025) - MVP Initial
- ✅ Flat Design bleu Tripline
- ✅ FAB avec menu déroulant
- ✅ Dashboard avec stats
- ✅ 5 vues (Tout/Restaurants/Activités/Calendrier/Par Ville)
- ✅ Système de priorités
- ✅ Export/Import JSON

---

## 🏆 Success Metrics (Future)

**KPIs à tracker :**
- Nombre de voyages créés
- Items ajoutés par voyage (moyenne)
- Taux d'utilisation mobile vs desktop
- Feature la plus utilisée
- Taux de rétention D7/D30
- Net Promoter Score (NPS)

**Objectifs MVP :**
- 100 premiers utilisateurs
- 50% mobile usage
- NPS > 40
- 5+ trips créés par utilisateur actif

---

**FIN DU DOCUMENT**

*Ce fichier doit être lu en entier avant de continuer le développement du projet.*
