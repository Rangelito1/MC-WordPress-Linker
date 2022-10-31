const Connection = require('./Connection');
const PluginProtocol = require('./PluginProtocol');
const FtpProtocol = require('./FtpProtocol');

class ServerConnection extends Connection {

    /**
     * @typedef {object} ChatChannelData - The data for a chatchannel.
     * @property {string} id - The id of the channel.
     * @property {string[]} types - The enabled types of the chatchannel.
     * @property {string} [webhook] - The webhook id of the chatchannel.
     */

    /**
     * @typedef {object} PluginServerConnectionData - The data for a server-connection established by the plugin.
     * @property {string} id - The id of the server.
     * @property {string} ip - The ip of the server.
     * @property {number} port - The port used to connect to the server plugin.
     * @property {number} version - The minor minecraft version of the server.
     * @property {string} path - The path to the world folder of the server.
     * @property {string} hash - The connection hash used to connect to the server plugin.
     * @property {boolean} online - Whether online mode is enabled on this server.
     * @property {ChatChannelData[]} [channels] - The chatchannels connected to the server.
     * @property {'plugin'} protocol - The protocol used to connect to the server.
     */

    /**
     * @typedef {object} FtpServerConnectionData - The data for a server-connection established by ftp or sftp.
     * @property {string} id - The id of the server.
     * @property {string} ip - The ip of the server.
     * @property {string} username - The ftp username used to connect to the server.
     * @property {string} password - The ftp password used to connect to the server.
     * @property {number} port - The ftp port used to connect to the server.
     * @property {number} version - The minor minecraft version of the server.
     * @property {string} path - The path to the world folder of the server.
     * @property {boolean} online - Whether the server-connection has online mode enabled or not.
     * @property {'ftp'|'sftp'} protocol - The protocol used to connect to the server.
     */

    /**
     * @typedef {PluginServerConnectionData|FtpServerConnectionData} ServerConnectionData - The data of the server.
     */

    /**
     * @typedef {ServerConnection|string} ServerConnectionResolvable - Data that resolves to a ServerConnection object.
     */

    /**
     * @param {MCLinker} client - The client to create the server-connection for.
     * @param {ServerConnectionData} data - The data for the server-connection.
     * @param {string} outputPath - The path to write the server-connection to.
     * @param {string} [outputFile='connection.json'] - The file to write the server-connection to.
     * @returns {ServerConnection} - A new ServerConnection instance.
     */
    constructor(client, data, outputPath, outputFile = 'connection.json') {
        super(client, data, outputPath, outputFile);

        /**
         * The settings for this server.
         * @type {SettingsConnection}
         */
        this.settings = client.settingsConnections._add(data.id, true, {
            id: data.id,
            extras: [client.settingsConnections.outputPath],
        });

        /**
         * The ftp or plugin protocol for this server.
         * @type {PluginProtocol|FtpProtocol}
         */
        this.protocol = data.protocol === 'plugin' ?
            new PluginProtocol(client, {
                id: data.id,
                ip: data.ip,
                port: data.port,
                hash: data.hash,
            }) :
            new FtpProtocol(client, {
                ip: data.ip,
                port: data.port,
                password: data.password,
                username: data.username,
                sftp: data.protocol === 'sftp',
            });

        this._patch(data);
    }

    _patch(data) {

        /**
         * The id of this server.
         * @type {string}
         * */
        this.id = data.id ?? this.id;

        /**
         * The ip of this server.
         * @type {string}
         * */
        this.ip = data.ip ?? this.ip;

        /**
         * The port of this server.
         * @type {number}
         * */
        this.port = data.port ?? this.port;

        /**
         * The minecraft version of this server.
         * @type {number}
         * */
        this.version = data.version ?? this.version;

        /**
         * The path to the world folder of this server.
         * @type {string}
         * */
        this.path = data.path ?? this.path;

        /**
         * Whether online mode is enabled on this server.
         * @type {boolean}
         * */
        this.online = data.online ?? this.online;


        if('username' in data) {
            /**
             * The ftp username used to connect to this server.
             * @type {string}
             * */
            this.username = data.username;
        }
        if('password' in data) {
            /**
             * The ftp password used to connect to this server.
             * @type {string}
             * */
            this.password = data.password;
        }
        if('hash' in data) {
            /**
             * The hash used to connect to this server's plugin.
             * @type {string}
             * */
            this.hash = data.hash;
        }
        if('channels' in data) {
            /**
             * The chatchannels connected to this server.
             * @type {ChatChannelData[]}
             * */
            this.channels = data.channels;
        }

        //Switch protocols if needed
        if(!this.hasPluginProtocol() && data.protocol === 'plugin') {
            this.protocol = new PluginProtocol(this.client, {
                id: data.id,
                ip: this.ip,
                port: this.port,
                hash: this.hash,
            });
            delete this.username;
            delete this.password;
        }
        else if(this.hasPluginProtocol() && (data.protocol === 'ftp' || data.protocol === 'sftp')) {
            this.protocol = new FtpProtocol(this.client, {
                ip: this.ip,
                port: this.port,
                password: this.password,
                username: this.username,
                sftp: data.protocol === 'sftp',
            });

            delete this.hash;
            delete this.channels;
        }
        else this.protocol._patch(data);
    }

    async _output() {
        if(await super._output()) {
            return await this.settings._output();
        }
        else return false;
    }

    /**
     * @inheritDoc
     */
    getData() {
        const baseData = {
            id: this.id,
            ip: this.ip,
            port: this.port,
            version: this.version,
            path: this.path,
            online: this.online,
        };

        if(this.hasPluginProtocol()) {
            return {
                ...baseData,
                hash: this.hash,
                channels: this.channels ?? [],
                protocol: 'plugin',
            };
        }
        else if(!this.hasPluginProtocol()) {
            return {
                ...baseData,
                password: this.password,
                username: this.username,
                protocol: this.protocol.sftp ? 'sftp' : 'ftp',
            };
        }
    }

    /**
     * Checks whether this server is connected to a plugin.
     * @returns {boolean}
     */
    hasPluginProtocol() {
        return this.protocol instanceof PluginProtocol;
    }
}

module.exports = ServerConnection;