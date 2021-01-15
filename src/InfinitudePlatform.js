const { pluginName, platformName } = require('./constants');

const configSchema = require('./configSchema');
const InfinitudeClient = require('./InfinitudeClient');
const InfinitudeSensor = require('./InfinitudeSensor');

let AccessoryCategories, TemperatureSensor, OutsideUuid;

module.exports = class InfinitudePlatform {
  constructor(log, config, api) {
    log.info('Initializing...');

    if (!config) {
      log.error('Plugin not configured.');
      return;
    }

    const result = configSchema.validate(config);
    if (result.error) {
      log.error('Invalid config.', result.error.message);
      return;
    }
	
    //FilterMaintenance = api.hap.Service.FilterMaintenance;
    AccessoryCategories = api.hap.Accessory.Categories;
    TemperatureSensor = api.hap.Service.TemperatureSensor;
    OutsideUuid = api.hap.uuid.generate('outsideZone');

    this.log = log;
    this.api = api;
    this.accessories = {};
    this.sensors = {};
    this.zoneIds = {};
    this.zoneNames = {};
    this.initialized = false;
    this.client = new InfinitudeClient(config.url, config.holdUntil, this.log);
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
  }

  configureAccessory(accessory) {
    this.initializeZones(false).then(
      function() {
        this.accessories[accessory.UUID] = accessory;
          this.configureSensorAccessory(accessory);
        }
      }.bind(this)
    );
  }
	
  async didFinishLaunching() {
    setTimeout(
      function() {
        this.initializeZones(true);
      }.bind(this),
      // wait 5 seconds to allow for existing accessories to be configured
      5000
    );
  }

  async initializeZones(create = true) {
    if (this.initialized) {
      this.log.info('INITIALIZED!');
      return;
    }

    return this.client.getStatus().then(
      function(status) {
        const enabledZones = status['zones']['zone'].filter(zone => zone['enabled'] === 'on');

        for (const zone of enabledZones) {
          const zoneId = zone.id;
          const zoneName = `${zone.name} Thermostat`;
          const tUuid = this.api.hap.uuid.generate(zoneId);	
          this.zoneIds[tUuid] = zoneId;
          this.zoneNames[tUuid] = zoneName;
          if (create) if (create) {
      this.accessories[OutsideUuid] = this.accessories[OutsideUuid] || this.createSensorAccessory(OutsideUuid);
    }
        }
	 
        this.initialized = true;
        this.api.emit('didFinishInit');
      }.bind(this)
    );
  }
  
  createSensorAccessory(uuid) {
    const sensorAccessory = new this.api.platformAccessory('OAT', uuid, AccessoryCategories.TEMPERATURESENSOR);
    this.log.info(`Creating new Sensor for OAT`);
    sensorAccessory.addService(TemperatureSensor);
    this.api.registerPlatformAccessories(pluginName, platformName, [sensorAccessory]);
    this.configureSensorAccessory(sensorAccessory);
    return sensorAccessory;
  }
  
  configureSensorAccessory(accessory) {
    const sensorName = this.getSensorName(accessory);
    new InfinitudeSensor(
      sensorName,
      this.client,
      this.log,
      accessory,
      this.Service,
      this.Characteristic
    )
  }
	
  getSensorName(accessory) {
    return 'OAT';
  }
};
