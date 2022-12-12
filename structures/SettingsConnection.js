import Connection from './Connection.js';

export default class SettingsConnection extends Connection {

    static defaultSettingsData = {
        disabled: {
            commands: [],
            advancements: [],
            stats: [],
        },
        language: 'en_us',
    };

    /**
     * @typedef {object} DisableData - The data for disabled commands, advancements or stats.
     * @property {string[]} commands - The disabled commands.
     * @property {string[]} advancements - The disabled advancements.
     * @property {string[]} stats - The disabled stats.
     */

    /**
     * @typedef {object} SettingsConnectionData - The data for the settings.
     * @property {DisableData} disabled - The data for disabled commands, advancements or stats.
     * @property {string} language - The language code id this server uses.
     * @property {string} id - The id of the server the settings are connected to.
     */

    /**
     * @typedef {SettingsConnection|string} SettingsConnectionResolvable - Data that resolves to a SettingsConnection object.
     */

    /**
     * @param {MCLinker} client - The client to create the settings for.
     * @param {SettingsConnectionData|string} dataOrId - The data for the settings or the id of the server the settings are connected to.
     * @param {string} outputPath - The path to write the settings to.
     * @param {string} [outputFile='settings.json'] - The name of the file to write the settings to.
     * @returns {SettingsConnection} - A new SettingsConnection instance.
     */
    constructor(client, dataOrId, outputPath, outputFile = 'settings.json') {
        if(typeof dataOrId === 'string') {
            //Default settings data
            dataOrId = {
                ...SettingsConnection.defaultSettingsData,
                id: dataOrId,
            };
        }
        super(client, dataOrId, outputPath, outputFile);

        this._patch(dataOrId);
    }

    _patch(data) {
        if(typeof data === 'string') {
            //Default settings data
            data = {
                ...SettingsConnection.defaultSettingsData,
                id: data,
            };
        }

        /**
         * The id of the server the settings are connected to.
         * @type {string}
         * */
        this.id = data.id ?? this.id;

        /**
         * The language code id this server uses.
         * @type {string}
         */
        this.language = data.language ?? this.language;

        /**
         * The data for disabled commands, advancements or stats.
         * @type {DisableData}
         */
        this.disabled ??= {
            commands: [],
            advancements: [],
            stats: [],
        };

        //Loop over data.disabled and assign commands, advancements and stats to this.disabled
        if('disabled' in data) {
            if('commands' in data.disabled) {
                this.disabled.commands = data.disabled.commands;
            }
            if('advancements' in data.disabled) {
                this.disabled.advancements = data.disabled.advancements;
            }
            if('stats' in data.disabled) {
                this.disabled.stats = data.disabled.stats;
            }
        }
    }

    /**
     * Disables a command, advancement or stat.
     * @param {'commands'|'advancements'|'stats'} type - The type of the value to disable.
     * @param {string} value - The value to disable.
     * @returns {Promise<?SettingsConnection>} - The settings instance that has been edited.
     */
    async disable(type, value) {
        const currentValues = this.disabled[type];
        currentValues.push(value);
        return await this.edit({ [type]: [currentValues] });
    }

    /**
     * Enables a command, advancement or stat.
     * @param {'commands'|'advancements'|'stats'} type - The type of the value to enable.
     * @param {string} value - The value to enable.
     * @returns {Promise<SettingsConnection>}
     */
    async enable(type, value) {
        const currentValues = this.disabled[type];
        const index = currentValues.indexOf(value);
        if(index !== -1) currentValues.splice(index, 1);
        return await this.edit({ [type]: [currentValues] });
    }

    /**
     * Checks whether a command, advancement or stat is disabled.
     * @param {'commands'|'advancements'|'stats'} type - The type of the value to check.
     * @param {string} value - The value to check.
     * @returns {boolean}
     */
    isDisabled(type, value) {
        return this.disabled[type].includes(value);
    }

    /**
     * @inheritDoc
     */
    getData() {
        return {
            disabled: this.disabled,
            language: this.language,
            id: this.id,
        };
    }
}
