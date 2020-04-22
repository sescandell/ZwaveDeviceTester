Vue.component('app', {
    template: `
        <div>
            <zwave-controller />
            <zwave-node />
        </div>
    `,
});

Vue.component('zwave-controller', {
    data: function() {
        return {
            started: false,
            loading: false,
        };
    },
    template: `
        <div>
            <h1>Controller</h1>
            <span @click="start" v-if="!started">Start<span v-if="loading"> *</span></span>
            <span @click="stop" v-else>Stop</span>
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
        }
    }
});

Vue.component('zwave-node', {
    data: function() {
        return {
            node: null,
            nodeId: null
        };
    },
    template: `
        <div>
            <h1>Node</h1>
            <input v-model="nodeId" /> <span @click="load">Charger</span>
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
                <div class="zwave-value-container">
                    <zwave-widget v-for="(value, index) in getCommandClass(38)" :key="index" :value="value" />
                </div>
                <pre>{{jsonNode}}</pre>
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
        getCommandClass: function(commClass) {
            return this.node.classes[commClass]
        },
        load: async function() {
            if (!this.nodeId) {
                this.node = null;

                return;
            }
            this.node = (await axios.get('zwave/nodes/' + this.nodeId)).data;
            console.log('%o', this.node);
        }
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
        <div class="zwave-value">
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
        <input type="range" :min="value.min" :max="value.max" @change="valueUpdated" :value="value.value" />
    </div>
    `,
    methods: {
        valueUpdated: async function(evt) {
            const value = parseInt(evt.target.value, 10) * 99 / this.value.max;
            this.value.value = 
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
