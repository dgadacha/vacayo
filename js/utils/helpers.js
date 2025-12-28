function getPriorityBadge(priority) {
    if (!priority || priority === 'normal') return '';
    
    const badges = {
        'must-do': { label: 'Must-Do' },
        'high': { label: 'Haute' },
        'low': { label: 'Basse' },
        'optional': { label: 'Optionnel' }
    };
    
    const badge = badges[priority];
    if (!badge) return '';
    
    return `<span class="priority-badge priority-${priority}-badge">${badge.label}</span>`;
}

function refreshIcons() {
    setTimeout(() => lucide.createIcons(), 50);
}

// Mapping catégorie → icône + couleur
function getCategoryIcon(type, category) {
    if (!category) return { icon: 'image-off', color: '#8E8E93' };
    
    const categoryLower = category.toLowerCase();
    
    // Icônes + couleurs pour restaurants
    if (type === 'restaurant') {
        if (categoryLower.includes('ramen')) return { icon: 'soup', color: '#FF9500' }; // Orange
        if (categoryLower.includes('sushi') || categoryLower.includes('omakase')) return { icon: 'fish', color: '#FF2D55' }; // Rose
        if (categoryLower.includes('bbq') || categoryLower.includes('yakiniku') || categoryLower.includes('grill')) return { icon: 'flame', color: '#FF3B30' }; // Rouge
        if (categoryLower.includes('tonkatsu') || categoryLower.includes('gyukatsu') || categoryLower.includes('katsu')) return { icon: 'drumstick', color: '#FF9500' }; // Orange
        if (categoryLower.includes('teppanyaki')) return { icon: 'chef-hat', color: '#8E8E93' }; // Gris
        if (categoryLower.includes('izakaya') || categoryLower.includes('bar')) return { icon: 'beer', color: '#FFCC00' }; // Jaune
        if (categoryLower.includes('café') || categoryLower.includes('coffee')) return { icon: 'coffee', color: '#8B4513' }; // Marron
        if (categoryLower.includes('marché') || categoryLower.includes('market')) return { icon: 'shopping-basket', color: '#34C759' }; // Vert
        if (categoryLower.includes('street food')) return { icon: 'shopping-cart', color: '#FF9500' }; // Orange
        if (categoryLower.includes('fruits de mer') || categoryLower.includes('seafood')) return { icon: 'fish', color: '#5AC8FA' }; // Cyan
        if (categoryLower.includes('poulet') || categoryLower.includes('chicken')) return { icon: 'drumstick', color: '#FF9500' }; // Orange
        if (categoryLower.includes('coréen') || categoryLower.includes('korean')) return { icon: 'flame', color: '#FF3B30' }; // Rouge
        if (categoryLower.includes('gastronomie') || categoryLower.includes('michelin')) return { icon: 'star', color: '#FFCC00' }; // Jaune doré
        return { icon: 'utensils', color: '#8E8E93' }; // Gris par défaut
    }
    
    // Icônes + couleurs pour activités
    if (type === 'activity') {
        if (categoryLower.includes('temple') || categoryLower.includes('sanctuaire') || categoryLower.includes('shrine')) return { icon: 'church', color: '#AF52DE' }; // Violet
        if (categoryLower.includes('observation') || categoryLower.includes('tower') || categoryLower.includes('tour')) return { icon: 'binoculars', color: '#007AFF' }; // Bleu
        if (categoryLower.includes('musée') || categoryLower.includes('museum') || categoryLower.includes('digital')) return { icon: 'gallery-horizontal', color: '#5856D6' }; // Indigo
        if (categoryLower.includes('shopping') || categoryLower.includes('quartier moderne')) return { icon: 'shopping-bag', color: '#FF2D55' }; // Rose
        if (categoryLower.includes('parc') || categoryLower.includes('park') || categoryLower.includes('jardin')) return { icon: 'trees', color: '#34C759' }; // Vert
        if (categoryLower.includes('palais') || categoryLower.includes('palace') || categoryLower.includes('château')) return { icon: 'castle', color: '#FFCC00' }; // Jaune doré
        if (categoryLower.includes('quartier') || categoryLower.includes('district') || categoryLower.includes('village')) return { icon: 'map-pin', color: '#FF9500' }; // Orange
        if (categoryLower.includes('onsen') || categoryLower.includes('spa')) return { icon: 'waves', color: '#5AC8FA' }; // Cyan
        if (categoryLower.includes('montagne') || categoryLower.includes('mountain')) return { icon: 'mountain', color: '#8E8E93' }; // Gris
        if (categoryLower.includes('plage') || categoryLower.includes('beach')) return { icon: 'waves', color: '#5AC8FA' }; // Cyan
        if (categoryLower.includes('point d\'intérêt')) return { icon: 'camera', color: '#FF9500' }; // Orange
        if (categoryLower.includes('promenade') || categoryLower.includes('walk')) return { icon: 'footprints', color: '#34C759' }; // Vert
        if (categoryLower.includes('artistique') || categoryLower.includes('art')) return { icon: 'palette', color: '#FF2D55' }; // Rose
        return { icon: 'map-pin', color: '#8E8E93' }; // Gris par défaut
    }
    
    // Icônes + couleurs pour hôtels
    if (type === 'hotel') {
        return { icon: 'bed', color: '#007AFF' }; // Bleu
    }
    
    return { icon: 'image-off', color: '#8E8E93' }; // Gris par défaut
}