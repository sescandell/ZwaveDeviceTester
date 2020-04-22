const ZWaveManager = require('./zwave');
const Express = require('express');
const app = Express();

app.use(Express.static('public'));
app.use(Express.json());       // to support JSON-encoded bodies
app.use(Express.urlencoded()); // to support URL-encoded bodies

app.get('/', (req, res) => res.sendFile(__dirname + '/views/index.html'));

app.post('/zwave/start', (req, res) => {
    ZWaveManager.start();

    return res.send({
        success: true
    });
});

app.post('/zwave/stop', (req, res) => {
    ZWaveManager.stop();

    return res.send({
        success: true
    });
});

app.get('/zwave/nodes/:nodeId', (req, res) => {
    return res.send(ZWaveManager.getNode(req.params.nodeId));
});

app.post('/zwave/nodes/:nodeId/value', (req, res) => {
    ZWaveManager.setValue(
        req.params.nodeId,
        req.body.commClass,
        req.body.instance,
        req.body.index,
        req.body.value
    );

    return res.send({success: true});
});

app.post('/zwave/nodes/:nodeId/push', (req, res) => {
    ZWaveManager.pressButton(
        req.params.nodeId,
        req.body.commClass,
        req.body.instance,
        req.body.index
    );

    return res.send({success: true});
});

app.post('/zwave/nodes/:nodeId/release', (req, res) => {
    ZWaveManager.releaseButton(
        req.params.nodeId,
        req.body.commClass,
        req.body.instance,
        req.body.index
    );

    return res.send({success: true});
});

app.listen(8080, () => console.log('App listening on http://localhost:8080'));
