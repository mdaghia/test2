// MongoDB initialization script
db = db.getSiblingDB('tax_db');
db.createUser({
  user: 'tax_app',
  pwd: 'tax_secret',
  roles: [{ role: 'readWrite', db: 'tax_db' }],
});
db.createCollection('contribuenti');
db.createCollection('immobili');
db.createCollection('dichiarazioniimus');
db.createCollection('versamentoimu');
db.createCollection('attoprovvedimentos');
print('MongoDB tax_db initialized');
