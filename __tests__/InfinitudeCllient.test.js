const nock = require('nock');
const InfinitudeClient = require('../src/InfinitudeClient');
jest.useFakeTimers();

global.console = { error: jest.fn(), info: jest.fn() };

describe('InfinitudeClient', () => {
  const url = 'http://localhost';

  test('Status works as expected', async () => {
    const client = new InfinitudeClient(url, '00:00', console);
    const scope = nock(url)
      .get('/status.xml')
      .replyWithFile(200, '__tests__/resources/status.xml', {
        'Content-Type': 'application/xml'
      });
    const status = await client.getStatus();
    expect(status['cfgem']).toBe('F');
    expect(scope.isDone()).toBe(true);
  });

  test('Systems works as expected', async () => {
    const client = new InfinitudeClient(url, '00:00', console);
    const scope = nock(url)
      .get('/systems.json')
      .replyWithFile(200, '__tests__/resources/systems.json', {
        'Content-Type': 'application/json'
      });

    const systems = await client.getSystems();
    expect(systems['system'][0]['version']).toBe('1.7');
    expect(scope.isDone()).toBe(true);
  });

  test('Status handles errors', async () => {
    const client = new InfinitudeClient(url, '00:00', console);
    const scope = nock(url)
      .get('/status.xml')
      .reply(500)
      .get('/status.xml')
      .reply(404);

    const status = await client.getStatus();
    await client.getStatus();

    expect(status).toBe(undefined);
    expect(scope.isDone()).toBe(true);
  });

  test('Updates activity', async () => {
    const client = new InfinitudeClient(url, '00:00', console);
    const scope = nock(url)
      .get('/api/config/zones/zone/0?holdActivity=home&hold=on&otmr=00%3A00')
      .reply(200)
      .get('/systems.json')
      .replyWithFile(200, '__tests__/resources/systems.json', 'UTF-8', {
        'Content-Type': 'application/json'
      });

    const result = await client.setActivity('1', 'home', () => {});

    expect(result.status).toBe(200);
    expect(scope.isDone()).toBe(true);
  });
});
