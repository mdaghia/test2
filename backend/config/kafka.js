const { Kafka, logLevel } = require('kafkajs');
const logger = require('../utils/logger');

const TOPICS = {
  DICHIARAZIONI_CREATED:    'imu.dichiarazioni.created',
  CALCOLO_RICHIESTO:        'imu.calcolo.richiesto',
  CALCOLO_COMPLETATO:       'imu.calcolo.completato',
  ATTI_EMISSIONE:           'imu.atti.emissione',
  STAMPE_MASSIVE:           'stampe.massive.richieste',
  STAMPE_MASSIVE_RESULT:    'stampe.massive.risultati',
  VERSAMENTI_RICONCILIA:    'versamenti.riconciliazione',
  NOTIFICHE_CONTRIBUENTI:   'notifiche.contribuenti',
};

let kafka;
let producer;
let consumer;

async function initKafka() {
  kafka = new Kafka({
    clientId: 'tax-management',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    logLevel: logLevel.WARN,
    retry: { initialRetryTime: 300, retries: 10 },
  });

  // Create topics
  const admin = kafka.admin();
  await admin.connect();
  await admin.createTopics({
    waitForLeaders: true,
    topics: Object.values(TOPICS).map(topic => ({
      topic,
      numPartitions: 3,
      replicationFactor: 1,
    })),
  });
  await admin.disconnect();

  // Producer
  producer = kafka.producer({ allowAutoTopicCreation: true });
  await producer.connect();
  logger.info('Kafka producer connected');

  // Consumers (started by consumer service)
  logger.info('Kafka initialized');
}

function getProducer() {
  if (!producer) throw new Error('Kafka producer not initialized');
  return producer;
}

function getKafka() {
  if (!kafka) throw new Error('Kafka not initialized');
  return kafka;
}

module.exports = { initKafka, getProducer, getKafka, TOPICS };
