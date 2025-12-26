# 🚀 TRIPLINE - Documentation Projet

## 📋 Vue d'ensemble

**Tripline** est une application web de planification de voyages avec une identité visuelle moderne en bleu et blanc, adoptant un design flat.

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
- **Fichiers :**
  - `index-tripline.html` - Application complète standalone
  - `data.json` - Données par défaut (16 restaurants, 18 activités)

### Structure localStorage
```javascript
{
  "japanTripRestaurants": [...],
  "japanTripActivities": [...]
}
```

### Classes principales
```javascript
class Restaurant {
  constructor(name, city, cuisine, priceRange, googleMapsUrl, photoUrl, 
              tiktokLink, notes, isReserved, reservationDate, priority, 
              bookingUrl, id)
}

class Activity {
  constructor(name, city, category, date, time, duration, cost, 
              googleMapsUrl, photoUrl, tiktokLink, notes, isBooked, 
              reservationDate, priority, bookingUrl, id)
}
```

### Fonctions principales
- `loadData()` - Charge depuis data.json ou localStorage
- `saveData()` - Sauvegarde dans localStorage
- `renderItems()` - Affichage des cards
- `exportData()` - Export JSON
- `importData()` - Import JSON

---

## 🎨 Design System Tripline

### Palette de couleurs (Flat Design)

**Bleus Tripline :**
- Primary Blue: `#0A66C2` (LinkedIn blue - pro & confiance)
- Light Blue: `#E7F3FF` (Backgrounds légers)
- Dark Blue: `#064789` (Textes importants)
- Accent Blue: `#3B82F6` (Boutons, liens)

**Neutres :**
- White: `#FFFFFF`
- Off-white: `#F8FAFC` (Fond principal)
- Light Gray: `#E2E8F0` (Borders)
- Gray: `#64748B` (Textes secondaires)
- Dark: `#1E293B` (Textes principaux)

**Accents :**
- Success: `#10B981` (Vert validé)
- Warning: `#F59E0B` (Orange priorité)
- Error: `#EF4444` (Rouge important)

### Typographie
- **Police :** Inter (Google Fonts)
- **Logo :** Inter 800 (Extra Bold)
- **Titres :** Inter 600-700
- **Texte :** Inter 400-500

### Principes de design
✅ **Flat Design pur** - Pas de dégradés, pas d'ombres (sauf FAB)
✅ **Bordures solides** - 2px pour tout
✅ **Coins arrondis** - 8px (cards, boutons), 12px (inputs)
✅ **Transitions smooth** - 0.2s pour toutes les interactions
✅ **Mobile-first** - Optimisé pour mobile avant tout

---

## ✨ Features Implémentées

### 1. Gestion des items
- ✅ Ajouter restaurant/activité
- ✅ Modifier un item
- ✅ Supprimer un item
- ✅ Marquer comme réservé/booké

### 2. Système de priorités
- 🔴 Must-do (background rouge léger)
- 🟠 High (background orange léger)
- ⚪ Normal (background neutre)
- 🔵 Low (opacité 0.7)
- ⚫ Optional (opacité 0.5)

### 3. Organisation
- **Tabs :** Tout / Restaurants / Activités / Calendrier / Par Ville
- **Tri :** Par prix, par priorité, par date
- **Filtres :** Par ville, par district

### 4. Vues disponibles
- **Liste complète** - Tous les items
- **Par type** - Restaurants ou Activités séparés
- **Calendrier** - Vue par date de réservation
- **Par ville** - Groupé par ville puis district

### 5. Export/Import
- ✅ Export JSON (téléchargement)
- ✅ Import JSON (upload fichier)
- ✅ Clear all data

### 6. Interface moderne
- ✅ Header avec logo Tripline gradient bleu
- ✅ Dashboard avec 4 stats cards
- ✅ Cards avec boutons alignés en bas (flexbox)
- ✅ Dark mode (toggle 🌙)
- ✅ **FAB (Floating Action Button)** - Bouton + fixe en bas à droite
  - Click → Menu avec 2 options (Restaurant/Activité)
  - Animation rotation 90° au hover
  - Auto-close si click ailleurs

### 7. Détails des cards
- Photo (avec fallback si erreur)
- Titre + ville
- Prix/coût
- Cuisine ou catégorie
- Notes
- Badge priorité
- Badge réservé/non réservé
- **Boutons en bas (toujours alignés) :**
  - 📍 Google Maps
  - 🍽️ Réserver (si bookingUrl existe)

---

## 📂 Structure de données

### Restaurant (16 items par défaut)
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
  "reservationDate": "",
  "priority": "high",
  "bookingUrl": "https://...",
  "type": "restaurant"
}
```

### Activity (18 items par défaut)
```json
{
  "id": "activity_xxx",
  "name": "TeamLab Borderless",
  "city": "Tokyo - Odaiba",
  "category": "Musée digital",
  "date": "",
  "time": "",
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
  "type": "activity"
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
    },
    {
      "id": "trip_456",
      "name": "Italie 2026",
      ...
    }
  ],
  "currentTripId": "trip_123"
}
```

**Features à ajouter :**
1. Page d'accueil avec liste des voyages
2. Bouton "Créer un voyage"
3. Switch entre voyages
4. CRUD complet sur les trips
5. Breadcrumb : Mes voyages > Japon 2026 > Restaurants

---

### 📊 TOP 5 Quick Wins (2-3h total)

#### 1. ✅ FAB (FAIT)
- Bouton + fixe en bas à droite
- Menu avec Restaurant/Activité

#### 2. Quick filters Pills (1h)
```
[Tous] [Must-do 🔴] [Réservé ✓] [Tokyo] [<10k¥]
```
- Pills cliquables en haut de liste
- Multi-sélection
- Filtrage instantané

#### 3. Budget Progress Bar (1h)
```
Budget utilisé : 125,000¥ / 500,000¥
[████████░░░░░░░░] 25%
```
- Barre visuelle
- Alerte si dépassement
- Par catégorie

#### 4. Toast Notifications (30min)
```
✅ Restaurant ajouté !
❌ Erreur de sauvegarde
```
- Auto-dismiss 3s
- Couleurs selon type
- Position top ou bottom

#### 5. Empty States illustrés (1h)
- SVG illustrations
- Call-to-action clair
- Plus engageant

---

### 🎨 Améliorations UX (Roadmap complète)

**Voir fichier :** `tripline-roadmap-ux.pdf`

**Catégories :**
1. Navigation & Organisation (Breadcrumb, FAB, Recherche)
2. Data Visualization (Budget, Timeline, Map)
3. Polish UI (Empty states, Loading, Micro-interactions)
4. Mobile First (Swipe, Bottom nav, Pull refresh)
5. Features Smart (Suggestions IA, Quick filters, Batch actions)
6. Détails pro (Hover preview, Drag & drop, Export amélioré)

---

## 📱 Deployment

### GitHub Pages (Recommandé)
```
Structure repo:
├── index.html (renommer index-tripline.html)
└── data.json
```

**Setup :**
1. Upload les 2 fichiers sur GitHub
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
- 🗺️ **Offline mode** : PWA avec cache
- 📊 **Analytics** : Stats de voyage

---

## 🐛 Bugs connus & Limitations

### Limitations actuelles
- ❌ Pas de backend → Données locales uniquement
- ❌ Pas de sync entre appareils
- ❌ Pas de collaboration temps réel
- ❌ Un seul voyage à la fois
- ❌ Pas de géolocalisation
- ❌ Pas de carte interactive

### Points d'attention
- LocalStorage limité à ~5-10MB
- Données perdues si cache navigateur vidé
- Pas de backup automatique (export JSON manuel)

---

## 💡 Décisions de design importantes

### Pourquoi Flat Design ?
- Plus moderne et épuré
- Meilleure performance (moins de CSS)
- Tendance actuelle du web design
- Focus sur le contenu

### Pourquoi pas de recherche globale ?
- Décision utilisateur de garder seulement le FAB
- Peut être ajouté plus tard si besoin
- Les filtres par tab suffisent pour l'instant

### Pourquoi localStorage ?
- Prototype rapide sans backend
- Pas de coût d'hébergement
- Offline-first par défaut
- Migration future vers IndexedDB ou backend possible

### Pourquoi bleu Tripline ?
- Couleur professionnelle et de confiance
- Évoque le voyage et le ciel
- Se démarque des concurrents (souvent verts/oranges)
- LinkedIn blue = familier et rassurant

---

## 🔧 Comment continuer le projet

### Si tu reprends le projet dans une nouvelle conversation :

1. **Lire ce fichier CLAUDE.md** pour comprendre le contexte
2. **Charger index-tripline.html** pour voir le code actuel
3. **Vérifier la roadmap** dans tripline-roadmap-ux.pdf
4. **Tester l'app** pour comprendre l'UX actuelle

### Prochaines tâches suggérées (par ordre de priorité) :

**Phase 1 - Multi-voyages (Critique)**
1. Refacto localStorage pour structure multi-trips
2. Page d'accueil avec liste des voyages
3. Création/édition/suppression de trips
4. Switch entre trips

**Phase 2 - Quick wins UX**
1. Quick filters pills
2. Budget progress bar
3. Toast notifications
4. Empty states illustrés

**Phase 3 - Features avancées**
1. Timeline visuelle
2. Map view
3. Drag & drop
4. Export PDF amélioré

---

## 📚 Ressources & Références

### Design
- **Figma/Sketch** : Pas de maquettes (design direct dans le code)
- **Inspiration** : Airbnb, Notion, Linear
- **Palette** : Coolors.co pour la cohérence

### Technique
- **Google Fonts** : Inter
- **Icons** : Emojis natifs (pas de lib externe)
- **No framework** : Vanilla JS pour légèreté

### Concurrents analysés
- TripIt ($49/an) - Trop complexe
- Wanderlog (gratuit) - UI moche
- Google Trips (mort) - Opportunité
- Notion templates - Pas optimisé mobile

---

## 📞 Contact & Maintenance

**Créateur :** Dylan  
**Date de création :** Décembre 2025  
**Dernière mise à jour :** 26 décembre 2025  
**Version actuelle :** v1.0 (Prototype MVP)

---

## 🎯 Philosophie du projet

> "Simple, beau, efficace. Un trip planner qui ne prend pas la tête."

**Principes :**
- Mobile-first toujours
- Flat design épuré
- Performance avant tout
- UX intuitive
- Pas de bullshit features

**Non-négociables :**
- Pas de tracking utilisateur
- Pas de pub
- Données en local (privacy)
- Open source potentiel (à décider)

---

## ✅ Checklist avant lancement

### MVP (Minimum Viable Product)
- [x] Interface fonctionnelle
- [x] CRUD restaurants/activités
- [x] Export/Import JSON
- [x] Design Tripline flat
- [x] FAB button
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

---

**FIN DU DOCUMENT**

*Ce fichier doit être lu en entier avant de continuer le développement du projet.*
