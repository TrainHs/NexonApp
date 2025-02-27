db = db.getSiblingDB("Proyecto");

// Crear colecciones vacías si no existen
db.createCollection("usuarios");
db.createCollection("posts");


