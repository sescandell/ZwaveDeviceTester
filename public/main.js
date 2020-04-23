Vue.component('app', {
    template: `
        <div class="app">
            <zwave-controller />
        </div>
    `,
});

Vue.component('zwave-controller', {
    data: function() {
        return {
            started: false,
            loading: false,
            nodeId: null,
            nodes: [],
        };
    },
    template: `
        <div class="zwave-controller">
            <h1>Controller</h1>
            <span @click="start" v-if="!started">Start<span v-if="loading"> *</span></span>
            <span @click="stop" v-else>Stop</span>
            <div v-if="started">
                <span @click="addNode">Add Node</span>
            </div>
            <div>
                <label>
                    Node id:
                    <input type="text" v-model="nodeId"/>
                    <span @click="load">Load</span>
                </label>
            </div>
            <zwave-node v-for="node in nodes" :key="node.id" :id="node.id" :node="node.node"/>
        </div>
    `,
    methods: {
        start: async function() {
            this.loading = true;
            this.started = !this.started;
            try {
                await axios.post('zwave/start');
            } finally {
                this.loading = false;
            }
        },
        stop: async function() {
            this.loading = true;
            this.started = !this.started;
            try {
                const r = await axios.post('zwave/stop');
            } finally {
                this.loading = false;
            }
        },
        addNode: async function() {
            try {
                const r = await axios.post('zwave/nodes');
            } finally {
            }
        },
        load: async function() {
            if (!this.nodeId) {
                return;
            }

            if (this.nodes.filter(nodeDesc => nodeDesc.id == this.nodeId).length != 0) {
                // Already displayed
                return;
            }

            const node = (await axios.get('zwave/nodes/' + this.nodeId)).data;
            console.log('%o', node);

            this.nodes.push({id: this.nodeId, node: node});
            this.nodeId = null;
        },
    }
});

Vue.component('zwave-node', {
    props: {
        node: Object,
        id: Number,
    },
    data: function() {
        return {
            commClass: null,
            jsonHidden: true,
        };
    },
    template: `
        <div class="zwave-node">
            <h1>Node {{id}} <span @click="remove">Remove</span></h1>
            <div v-if="node">
                <h2>{{node.product}}</h2>
                <dl>
                    <dt>ProductType</dt>
                    <dd>{{node.producttype}}</dd>

                    <dt>ProductId</dt>
                    <dd>{{node.productid}}</dd>

                    <dt>Type</dt>
                    <dd>{{node.type}}</dd>
                </dl>
                <label>
                    CommClass: <input type="text" v-model="commClass" />
                </label>
                <div class="zwave-widget-container">
                    <zwave-widget v-for="(value, index) in getCommandClass()" :key="index" :value="value" />
                </div>
                <span v-if="jsonHidden" @click="toggleJson">View JSON</span>
                <span v-else @click="toggleJson">Hide JSON</span>
                <pre v-if="!jsonHidden">{{jsonNode}}</pre>
            </div>
        </div>
    `,
    computed: {
        jsonNode: function() {
            return JSON.stringify(this.node, null, 4);
        },
    },
    methods: {
        getComponentName: function(value) {
            if (value.type == 'byte' && value.genre == 'user') {
                return 'zwave-range';
            }

            return 'zwave-value';
        },
        getCommandClass: function() {
            if (null === this.commClass) {
                return;
            }

            return this.node.classes[this.commClass]
        },
        remove: function() {

        },
        toggleJson: function() {
            this.jsonHidden = !this.jsonHidden;
        },
    }
});

const componentFactory = {
    'byte': 'zwave-widget-range',
    'button': 'zwave-widget-button',
    'bool': 'zwave-widget-checkbox',
};

Vue.component('zwave-widget', {
    props: {
        value: Object,
    },
    template: `
        <div class="zwave-widget">
            <h3>{{value.label}}</h3>
            <span class="help">{{value.help}}</span>
            <dl>
                <dt>ID</dt><dd>{{value.value_id}}</dd>
                <dt>Type</dt><dd>{{value.type}} ({{value.min}} - {{value.max}})</dd>
                <dt>Genre</dt><dd>{{value.genre}}</dd>
                <dt>Value</dt><dd>{{value.value}}</dd>
                <dt>Mode</dt><dd>{{getMode()}}</dd>
            </dl>
            <component :is=getWidgetName() :value="value" v-if="!isReadOnly()"/>
        </div>
    `,
    methods: {
        isReadOnly: function() {
            return this.getMode() === 'RO';
        },
        getWidgetName: function() {
            if (componentFactory.hasOwnProperty(this.value.type)) {
                return componentFactory[this.value.type];
            }

            return 'zwave-widget-none';
        },
        getMode: function() {
            if (this.value.read_only) {
                return 'RO';
            }

            if (this.value.write_only) {
                return 'WO';
            }

            return 'RW';
        }
    }
});

Vue.component('zwave-widget-none', {
    props: {
        value: Object,
    },
    template: `<div class="zwave-widget-none"></div>`
});

Vue.component('zwave-widget-range', {
    props: {
        value: Object,
    },
    template: `
    <div class="zwave-widget-range">
        <input type="range" :min="value.min" :max="value.max" @change="valueUpdated" v-model="value.value" />
    </div>
    `,
    methods: {
        valueUpdated: async function(evt) {
            const value = parseInt(evt.target.value, 10) * 99 / this.value.max;
            console.log('%d => %d', parseInt(evt.target.value, 10), value);

            await axios.post(
                `/zwave/nodes/${this.value.node_id}/value`,
                {
                    commClass: this.value.class_id,
                    instance: this.value.instance,
                    index: this.value.index,
                    value: value
                }
            );
        }
    }
});

Vue.component('zwave-widget-button', {
    props: {
        value: Object,
    },
    template: `
    <div class="zwave-widget-button">
        <span @click="pushed">PUSH</span>
    </div>
    `,
    methods: {
        pushed: async function() {
            await axios.post(
                `/zwave/nodes/${this.value.node_id}/push`,
                {
                    commClass: this.value.class_id,
                    instance: this.value.instance,
                    index: this.value.index,
                }
            );
        }
    }
});

Vue.component('zwave-widget-checkbox', {
    props: {
        value: Object,
    },
    template: `
    <div class="zwave-widget-button">
        <input type="checkbox" @change="valueUpdated" :checked="checked"/>
    </div>
    `,
    computed: {
        checked: function() {
            return !!this.value.value;
        }
    },
    methods: {
        valueUpdated: async function() {
            this.value.value = !this.value.value;
            await axios.post(
                `/zwave/nodes/${this.value.node_id}/value`,
                {
                    commClass: this.value.class_id,
                    instance: this.value.instance,
                    index: this.value.index,
                    value: this.value.value
                }
            );
        }
    }
});

const app = new Vue({
  el: "#app",
});
