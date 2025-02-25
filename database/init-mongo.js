// Conectar a la base de datos "Proyecto"
db = db.getSiblingDB("Proyecto");

// Insertar datos desde JSON
db.usuarios.insertMany(require('/docker-entrypoint-initdb.d/users.json'));
db.posts.insertMany(require('/docker-entrypoint-initdb.d/posts.json'));

