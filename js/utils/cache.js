// Cache pour optimiser le tri et le filtrage - Version multi-états
const FilterCache = {
    cache: new Map(), // Stocker tous les états calculés
    
    // Générer une clé unique pour l'état actuel
    getKey(searchQuery, cityFilter, sortBy) {
        return `${searchQuery}|${cityFilter}|${sortBy}`;
    },
    
    // Vérifier si cet état existe en cache
    has(searchQuery, cityFilter, sortBy) {
        const key = this.getKey(searchQuery, cityFilter, sortBy);
        return this.cache.has(key);
    },
    
    // Sauvegarder les résultats
    save(searchQuery, cityFilter, sortBy, hotels, restaurants, activities) {
        const key = this.getKey(searchQuery, cityFilter, sortBy);
        this.cache.set(key, {
            hotels: [...hotels],
            restaurants: [...restaurants],
            activities: [...activities]
        });
        
        // Limiter le cache à 20 états pour éviter la surcharge mémoire
        if (this.cache.size > 20) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    },
    
    // Récupérer les résultats en cache
    get(searchQuery, cityFilter, sortBy) {
        const key = this.getKey(searchQuery, cityFilter, sortBy);
        const cached = this.cache.get(key);
        
        if (cached) {
            return {
                hotels: [...cached.hotels],
                restaurants: [...cached.restaurants],
                activities: [...cached.activities]
            };
        }
        
        return null;
    },
    
    // Vider le cache
    clear() {
        this.cache.clear();
    }
};