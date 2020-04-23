const ZWave = require('openzwave-shared');
const devicePath = "/dev/ttyACM0";
let homeid = null;
let nodes = [];

var zwave = new ZWave({
  Logging: false, // disable file logging (OZWLog.txt)
  ConsoleOutput: true, // enable console logging
});

zwave.on("connected", function (version) {
  console.log("**** CONNECTED ****");
  console.log("Openzwave version:", version);
});

zwave.on("driver ready", function (home_id) {
  homeid = home_id;
  console.log("scanning homeid=0x%s...", homeid.toString(16));
});

zwave.on("driver failed", function () {
  console.log("failed to start driver");
  process.exit();
});

zwave.on("node added", function (nodeid) {
  nodes[nodeid] = {
    manufacturer: "",
    manufacturerid: "",
    product: "",
    producttype: "",
    productid: "",
    type: "",
    name: "",
    loc: "",
    classes: {},
    ready: false,
  };
});

zwave.on("node event", function (nodeid, data) {
  console.log("node%d event: Basic set %d", nodeid, data);
});

zwave.on("value added", function (nodeid, comclass, value) {
  if (!nodes[nodeid]["classes"][comclass])
    nodes[nodeid]["classes"][comclass] = {};
  nodes[nodeid]["classes"][comclass][value.index] = value;
});

zwave.on("value changed", function (nodeid, comclass, value) {
  if (nodes[nodeid]["ready"]) {
    console.log(
      "node%d: changed: %d:%s:%s->%s",
      nodeid,
      comclass,
      value["label"],
      nodes[nodeid]["classes"][comclass][value.index]["value"],
      value["value"]
    );
  }
  nodes[nodeid]["classes"][comclass][value.index] = value;
});

zwave.on("value removed", function (nodeid, comclass, index) {
  if (
    nodes[nodeid]["classes"][comclass] &&
    nodes[nodeid]["classes"][comclass][index]
  )
    delete nodes[nodeid]["classes"][comclass][index];
});

zwave.on("node ready", function (nodeid, nodeinfo) {
  nodes[nodeid]["manufacturer"] = nodeinfo.manufacturer;
  nodes[nodeid]["manufacturerid"] = nodeinfo.manufacturerid;
  nodes[nodeid]["product"] = nodeinfo.product;
  nodes[nodeid]["producttype"] = nodeinfo.producttype;
  nodes[nodeid]["productid"] = nodeinfo.productid;
  nodes[nodeid]["type"] = nodeinfo.type;
  nodes[nodeid]["name"] = nodeinfo.name;
  nodes[nodeid]["loc"] = nodeinfo.loc;
  nodes[nodeid]["ready"] = true;
  console.log(
    "node%d: %s, %s",
    nodeid,
    nodeinfo.manufacturer
      ? nodeinfo.manufacturer
      : "id=" + nodeinfo.manufacturerid,
    nodeinfo.product
      ? nodeinfo.product
      : "product=" + nodeinfo.productid + ", type=" + nodeinfo.producttype
  );
  console.log(
    'node%d: name="%s", type="%s", location="%s"',
    nodeid,
    nodeinfo.name,
    nodeinfo.type,
    nodeinfo.loc
  );
  for (comclass in nodes[nodeid]["classes"]) {
    switch (comclass) {
      case 0x25: // COMMAND_CLASS_SWITCH_BINARY
      case 0x26: // COMMAND_CLASS_SWITCH_MULTILEVEL
        zwave.enablePoll(nodeid, comclass);
        break;
    }
    var values = nodes[nodeid]["classes"][comclass];
    console.log("node%d: class %d", nodeid, comclass);
    for (idx in values)
      console.log(
        "node%d:   %s=%s",
        nodeid,
        values[idx]["label"],
        values[idx]["value"]
      );
  }
});

zwave.on("notification", function (nodeid, notif) {
  switch (notif) {
    case 0:
      console.log("node%d: message complete", nodeid);
      break;
    case 1:
      console.log("node%d: timeout", nodeid);
      break;
    case 2:
      console.log("node%d: nop", nodeid);
      break;
    case 3:
      console.log("node%d: node awake", nodeid);
      break;
    case 4:
      console.log("node%d: node sleep", nodeid);
      break;
    case 5:
      console.log("node%d: node dead", nodeid);
      break;
    case 6:
      console.log("node%d: node alive", nodeid);
      break;
  }
});

zwave.on("scan complete", function () {
  console.log("====> scan complete");
  // set dimmer node 5 to 50%
  //    zwave.setValue(5,38,1,0,50);
  //zwave.setValue({node_id:5,	class_id: 38,	instance:1,	index:0}, 50 );
  zwave.requestAllConfigParams(3);
});

zwave.on("controller command", function (n, rv, st, msg) {
  console.log(
    "controller commmand feedback: %s node==%d, retval=%d, state=%d",
    msg,
    n,
    rv,
    st
  );
});

module.exports = {
  start: function() {
    zwave.connect(devicePath);
  },
  stop: function() {
    zwave.disconnect(devicePath)
  },
  getNode: function(nodeId) {
    return nodes[nodeId];
  },
  setValue: function(nodeId, commClass, instance, index, value) {
    const node = nodes[nodeId];
    if (null == node) {
      return;
    }

    zwave.setValue(nodeId, commClass, instance, index, value);
  },
  pressButton: function(nodeId, commClass, instance, index) {
    zwave.pressButton({
			node_id: nodeId,
			class_id: commClass,
			instance: instance,
			index: index,
		});
  },
  releaseButton: function(nodeId, commClass, instance, index) {
    zwave.releaseButton({
			node_id: nodeId,
			class_id: commClass,
			instance: instance,
			index: index,
		});
  },
  startEnteringMode: function() {
    zwave.addNode();
  }
};