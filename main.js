import { ShardingManager } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

// Cambia la referencia de './bot.js' a './commands/main/Inventory.js'
const manager = new ShardingManager('./commands/main/Inventory.js', { token: process.env.TOKEN });

manager.on('shardCreate', shard => {
    console.log(`Launched shard ${shard.id}`);
    shard.on('ready', () => {
        console.log(`Shard ${shard.id} ready`);
    });
});

manager.spawn();
